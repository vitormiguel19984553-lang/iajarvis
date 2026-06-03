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
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/lib/use-online-status";
import { WifiOff } from "lucide-react";
import {
  detectFileRequests,
  generateFile,
  type GeneratedFile,
} from "@/lib/file-generator";


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
  // Live ref so transport always sees the latest files at send time.
  const filesRef = useRef<UploadedFile[]>(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const buildFileContext = (list: UploadedFile[]): string => {
    const textFiles = list.filter(
      (f) => f.status === "analyzed" && f.content && f.kind !== "image",
    );
    if (textFiles.length === 0) return "";
    return textFiles
      .map((f) => {
        const c = (f.content ?? "").slice(0, 15000);
        const truncated = (f.content?.length ?? 0) > 15000 ? "\n…[truncado a 15k chars]" : "";
        return `═══════════════════════════════════
FICHEIRO ANEXADO: ${f.name}
TIPO: ${(f.kind ?? f.type).toUpperCase()} · ${f.size}${f.wordCount ? ` · ~${f.wordCount} palavras` : ""}${f.pageCount ? ` · ${f.pageCount} pág.` : ""}
═══════════════════════════════════
${c}${truncated}`;
      })
      .join("\n\n");
  };

  const buildImages = (list: UploadedFile[]) =>
    list
      .filter((f) => f.kind === "image" && f.base64 && f.status === "analyzed")
      .map((f) => ({ mimeType: f.mimeType, base64: f.base64! }));

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          const list = filesRef.current;
          return {
            headers,
            body: {
              messages,
              systemPrompt: settings.systemPrompt,
              model: settings.modelMode === "auto" ? "auto" : settings.manualModel,
              skills: skills.map((s) => s.text),
              hasFiles: list.length > 0,
              fileContext: buildFileContext(list),
              images: buildImages(list),
            },
          };
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.systemPrompt, settings.modelMode, settings.manualModel, skills],
  );


  const [input, setInput] = useState("");
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastLearnedIdRef = useRef<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, GeneratedFile[]>>({});
  const processedFilesRef = useRef<Set<string>>(new Set());


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
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/learn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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

  // File generation: scan assistant messages for [GERAR_ARQUIVO:...] tags.
  useEffect(() => {
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (processedFilesRef.current.has(last.id)) return;
    const text = partsToText(last);
    const reqs = detectFileRequests(text);
    if (reqs.length === 0) {
      processedFilesRef.current.add(last.id);
      return;
    }
    processedFilesRef.current.add(last.id);
    (async () => {
      const made: GeneratedFile[] = [];
      for (const r of reqs) {
        try {
          made.push(await generateFile(r.fileName, r.content));
        } catch (e) {
          console.error("file gen failed", r.fileName, e);
          toast.error(`Falha a gerar ${r.fileName}`);
        }
      }
      if (made.length > 0) {
        setGeneratedFiles((prev) => ({ ...prev, [last.id]: made }));
        toast.success(`${made.length} ficheiro(s) gerado(s) — clica em Baixar`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, messages.length]);



  const isBusy = status === "submitted" || status === "streaming";
  const isOnline = useOnlineStatus();
  const queueRef = useRef<string[]>([]);
  const [queueLen, setQueueLen] = useState(0);
  const wasOfflineRef = useRef(false);

  const enqueue = (text: string) => {
    queueRef.current.push(text);
    setQueueLen(queueRef.current.length);
  };

  const submit = async () => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    if (!isOnline) {
      enqueue(text);
      toast.warning("Sem ligação", {
        description: "Mensagem em fila. Será enviada quando voltares a ficar online.",
      });
      return;
    }
    if (messages.length === 0) onFirstUserMessage(text);
    await sendMessage({ text });
  };

  // Auto-flush queue when connection is restored
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      toast.success("Ligação restabelecida");
    }
    if (isBusy) return;
    if (queueRef.current.length === 0) return;
    const next = queueRef.current.shift()!;
    setQueueLen(queueRef.current.length);
    if (messages.length === 0) onFirstUserMessage(next);
    sendMessage({ text: next }).catch(() => {
      // re-enqueue at front on failure
      queueRef.current.unshift(next);
      setQueueLen(queueRef.current.length);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isBusy]);

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
            style={{ background: "var(--success)", boxShadow: "0 0 8px var(--success)" }}
          />
          <span
            className="text-[13px] font-semibold tracking-[0.18em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            J.A.R.V.I.S
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.15em] rounded-full px-2 py-0.5 font-semibold"
            style={{
              color: "var(--success)",
              background: "color-mix(in oklab, var(--success) 12%, transparent)",
              border: "1px solid color-mix(in oklab, var(--success) 30%, transparent)",
              fontFamily: "var(--font-display)",
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
            className="text-[10px] rounded-md px-2 py-0.5 font-bold tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-display)",
              color: settings.modelMode === "auto" ? "var(--accent-cyan)" : "var(--premium)",
              background:
                settings.modelMode === "auto"
                  ? "color-mix(in oklab, var(--accent-cyan) 10%, transparent)"
                  : "color-mix(in oklab, var(--premium) 14%, transparent)",
              border: `1px solid ${
                settings.modelMode === "auto"
                  ? "color-mix(in oklab, var(--accent-cyan) 25%, transparent)"
                  : "color-mix(in oklab, var(--premium) 35%, transparent)"
              }`,
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
              className="h-24 w-24 rounded-full mb-7 flex items-center justify-center text-white text-[32px] font-bold relative"
              style={{
                fontFamily: "var(--font-display)",
                background:
                  "radial-gradient(circle at 35% 30%, #4ff4ff, #00a8ff 45%, #7c3aed 90%)",
                boxShadow:
                  "0 0 60px color-mix(in oklab, var(--accent-cyan) 45%, transparent), inset 0 0 24px rgba(255,255,255,0.15)",
                animation: "orbPulse 3s ease-in-out infinite",
              }}
            >
              J
            </div>
            <h1
              className="text-[28px] tracking-[0.04em] text-center text-foreground"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              {greet()}, {greetingName || "Tony"}.
            </h1>
            <p className="text-[14px] text-muted-foreground text-center mt-2 mb-8">
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
              <ChatMessage key={m.id} message={m} generatedFiles={generatedFiles[m.id]} />
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

      {!isOnline && (
        <div
          className="px-5 py-2 text-[12px] border-t flex items-center gap-2"
          style={{
            color: "var(--warning)",
            borderColor: "color-mix(in oklab, var(--warning) 30%, transparent)",
            background: "color-mix(in oklab, var(--warning) 10%, transparent)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.04em",
          }}
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span className="font-semibold uppercase tracking-[0.15em]">Offline</span>
          <span className="opacity-80 normal-case tracking-normal" style={{ fontFamily: "inherit" }}>
            {queueLen > 0
              ? `${queueLen} mensagem${queueLen === 1 ? "" : "s"} em fila — envio automático ao reconectar.`
              : "Sem ligação. As mensagens ficam em fila."}
          </span>
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
