import { useEffect, useRef, useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ChatMessage } from "@/components/chat-message";
import { JarvisVoiceBar } from "@/components/jarvis-voice-bar";
import { VoiceMode } from "@/components/voice-mode";
import type { Thread } from "@/lib/use-threads";
import type { Settings, LearnedSkill } from "@/lib/use-settings";
import { MODEL_CATALOG } from "@/lib/models";
import type { Activity, UploadedFile } from "@/components/jarvis-right-panel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  thread: Thread;
  onMessagesChange: (messages: UIMessage[]) => void;
  onFirstUserMessage: (text: string) => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
  onAttachClick: () => void;
  settings: Settings;
  skills: LearnedSkill[];
  onLearnSkill: (text: string) => void;
  files: UploadedFile[];
  onActivityChange: (activities: Activity[]) => void;
  greetingName?: string | null;
}

const SUGGESTIONS = [
  "Analyze the latest project files",
  "Brief me on today's tasks",
  "Run a full system diagnostic",
  "Draft a technical report",
];

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function partsToText(m: UIMessage): string {
  return (m.parts || [])
    .map((p: { type: string; text?: string }) => (p.type === "text" ? p.text ?? "" : ""))
    .join("");
}

export function ChatWindow({
  thread,
  onMessagesChange,
  onFirstUserMessage,
  activeTab,
  setActiveTab,
  onAttachClick,
  settings,
  skills,
  onLearnSkill,
  files,
  onActivityChange,
  greetingName,
}: Props) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            systemPrompt: settings.systemPrompt,
            model: settings.modelMode === "auto" ? "auto" : settings.manualModel,
            skills: skills.map((s) => s.text),
            hasFiles: files.length > 0,
          },
        }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.systemPrompt, settings.modelMode, settings.manualModel, skills, files.length],
  );

  const [input, setInput] = useState("");
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastLearnedIdRef = useRef<string | null>(null);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport,
    onError: (err) => {
      const msg = err?.message ?? "";
      if (msg.includes("daily_limit_reached") || msg.includes("429")) {
        toast.error("Limite diário atingido", {
          description: "Plano Free: 50 mensagens/dia. Faz upgrade para Pro ou ativa uma chave.",
        });
      } else if (msg.includes("402")) {
        toast.error("Créditos esgotados", {
          description: "Adiciona créditos no workspace.",
        });
      } else {
        toast.error("Erro na resposta", { description: msg.slice(0, 200) });
      }
    },
  });

  useEffect(() => {
    onMessagesChange(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // Dynamic activity feed
  useEffect(() => {
    if (status === "submitted") {
      onActivityChange([
        { label: "Routing to best model", state: "done" },
        { label: "Building context window", state: "done" },
        { label: "Thinking…", state: "active" },
        { label: "Generating response", state: "pending" },
      ]);
    } else if (status === "streaming") {
      onActivityChange([
        { label: "Routing to best model", state: "done" },
        { label: "Building context window", state: "done" },
        { label: "Reasoning complete", state: "done" },
        { label: "Streaming response", state: "active" },
      ]);
    } else if (status === "ready" && messages.length > 0) {
      onActivityChange([
        { label: `Last response (${messages.length} turns)`, state: "done" },
        { label: "Distilling learned skill", state: "active" },
        { label: "Awaiting next request", state: "pending" },
      ]);
    } else if (status === "error") {
      onActivityChange([{ label: "Error occurred", state: "active" }]);
    } else {
      onActivityChange([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, messages.length]);

  // Generative brain: after successful response, distill a skill
  useEffect(() => {
    if (status !== "ready") return;
    if (messages.length < 2) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    if (lastLearnedIdRef.current === last.id) return;
    lastLearnedIdRef.current = last.id;
    const prevUser = [...messages].reverse().find((m) => m.role === "user");
    if (!prevUser) return;
    const userText = partsToText(prevUser);
    const assistantText = partsToText(last);
    if (!userText.trim() || !assistantText.trim()) return;
    (async () => {
      try {
        const res = await fetch("/api/learn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: userText,
            assistantMessage: assistantText,
          }),
        });
        const data = (await res.json()) as { skill: string | null };
        if (data.skill) onLearnSkill(data.skill);
      } catch {
        /* silent */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, messages.length]);

  const isBusy = status === "submitted" || status === "streaming";

  const submit = async () => {
    const text = input.trim();
    if (!text || isBusy) return;
    if (messages.length === 0) onFirstUserMessage(text);
    setInput("");
    await sendMessage({ text });
  };

  const handleVoiceModeSpeech = async (text: string): Promise<string | null> => {
    if (messages.length === 0) onFirstUserMessage(text);
    try {
      await sendMessage({ text });
    } catch {
      return null;
    }
    // Wait for streaming to finish, then return the last assistant text.
    // We poll for up to 30s.
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        const reply = lastAssistantTextRef.current;
        if (reply && statusRef.current === "ready") {
          resolve(reply);
        } else if (Date.now() - started > 30000) {
          resolve(reply || null);
        } else {
          setTimeout(tick, 200);
        }
      };
      setTimeout(tick, 400);
    });
  };

  // Refs that mirror messages/status for the voice-mode polling.
  const lastAssistantTextRef = useRef<string | null>(null);
  const statusRef = useRef<string>("ready");
  useEffect(() => {
    statusRef.current = status;
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant") {
      lastAssistantTextRef.current = partsToText(last);
    }
  }, [messages, status]);

  const modelLabel =
    settings.modelMode === "auto"
      ? "Auto router"
      : MODEL_CATALOG.find((m) => m.id === settings.manualModel)?.label ?? "Gemini 3 Flash";

  return (
    <div className="flex flex-col h-full min-w-0 flex-1 bg-background">
      <header className="h-[52px] border-b border-border flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full pulse-dot"
            style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
          />
          <span className="text-[13px] font-medium text-foreground tracking-wide">
            J.A.R.V.I.S
          </span>
          <span
            className="text-[11px] rounded-full px-2 py-0.5"
            style={{
              color: "#22c55e",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            online
          </span>
        </div>

        <div className="flex gap-1.5">
          {["All", "Files", "Activity", "Stats"].map((tab) => {
            const key = tab.toLowerCase();
            const active = activeTab === key;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "text-[12px] px-3 py-1 rounded-lg font-medium transition-colors",
                  active
                    ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff]"
                    : "text-muted-foreground hover:text-[#00d4ff]",
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">Model: {modelLabel}</span>
          <div
            className="text-[11px] rounded-md px-2 py-0.5 font-semibold tracking-wider"
            style={{
              color: "#00d4ff",
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.12)",
            }}
          >
            {settings.modelMode === "auto" ? "AUTO" : "PRO"}
          </div>
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto scroll-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6 max-w-2xl mx-auto">
            <div
              className="h-20 w-20 rounded-full mb-6 flex items-center justify-center text-white text-[28px] font-bold"
              style={{
                background: "radial-gradient(circle at 35% 35%, #22eeff, #0a7aff, #7c3aed)",
                boxShadow: "0 0 40px rgba(0, 212, 255, 0.4)",
              }}
            >
              J
            </div>
            <h1 className="text-[26px] font-semibold tracking-tight text-center text-foreground">
              {greet()}, {greetingName || "Tony"}.
            </h1>
            <p className="text-[14px] text-muted-foreground text-center mt-1.5 mb-8">
              How can I assist you today?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left text-[13px] text-foreground/85 px-4 py-3 rounded-[10px] border border-border bg-elevated hover:border-[rgba(0,212,255,0.35)] hover:text-[#00d4ff] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
              <span>🎙 Voice conversation</span>
              <span>📁 File analysis</span>
              <span>🧠 {skills.length} learned skills</span>
              <span>⚡ Auto-routed models</span>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-5 flex flex-col gap-5">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {status === "submitted" && (
              <div className="text-[11px] text-muted-foreground pl-11">Thinking…</div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="px-5 py-2 text-[12px] text-destructive border-t border-border">
          Connection lost. Please try again.
        </div>
      )}

      <JarvisVoiceBar
        input={input}
        setInput={setInput}
        onSubmit={submit}
        isBusy={isBusy}
        onStop={stop}
        onAttachClick={onAttachClick}
        onOpenVoiceMode={() => setVoiceModeOpen(true)}
      />

      <VoiceMode
        open={voiceModeOpen}
        onClose={() => setVoiceModeOpen(false)}
        onUserSpeech={handleVoiceModeSpeech}
      />
    </div>
  );
}
