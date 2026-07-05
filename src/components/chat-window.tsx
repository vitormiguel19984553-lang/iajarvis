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
import { WifiOff, Menu } from "lucide-react";
import {
  detectFileRequests,
  generateFile,
  type GeneratedFile,
} from "@/lib/file-generator";
import { parseAPIError } from "@/lib/api-error";


interface Props {
  thread: Thread;
  onMessagesChange: (messages: UIMessage[]) => void;
  onFirstUserMessage: (text: string) => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
  onAttachClick: () => void;
  onToggleSidebar?: () => void;
  settings: Settings;
  skills: LearnedSkill[];
  onLearnSkill: (text: string) => void;
  files: UploadedFile[];
  onPickFiles?: (files: File[]) => void;
  onRemoveFile?: (name: string) => void;
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
  onToggleSidebar,
  settings,
  skills,
  onLearnSkill,
  files,
  onPickFiles,
  onRemoveFile,
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

  const buildAudios = (list: UploadedFile[]) =>
    list
      .filter((f) => f.kind === "audio" && f.base64 && f.status === "analyzed")
      .map((f) => ({ mimeType: f.mimeType, base64: f.base64!, name: f.name }));

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
              audios: buildAudios(list),
            },
          };
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.systemPrompt, settings.modelMode, settings.manualModel, skills],
  );


  const [input, setInput] = useState("");
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastLearnedIdRef = useRef<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, GeneratedFile[]>>({});
  const processedFilesRef = useRef<Set<string>>(new Set());


  const { messages, sendMessage, status, stop, error } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport,
    onError: (err) => {
      const { title, description } = parseAPIError(err);
      toast.error(title, description ? { description } : undefined);
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
    <div
      className="flex flex-col h-full min-w-0 flex-1 bg-background relative"
      onDragEnter={(e) => {
        if (!onPickFiles) return;
        if (!e.dataTransfer?.types?.includes("Files")) return;
        e.preventDefault();
        dragCounterRef.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        if (!onPickFiles) return;
        if (!e.dataTransfer?.types?.includes("Files")) return;
        e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (!onPickFiles) return;
        e.preventDefault();
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) setIsDragging(false);
      }}
      onDrop={(e) => {
        if (!onPickFiles) return;
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDragging(false);
        const dropped = Array.from(e.dataTransfer?.files ?? []);
        if (dropped.length > 0) onPickFiles(dropped);
      }}
    >
      <header className="h-[56px] border-b border-border/70 flex items-center justify-between px-3 md:px-5 shrink-0 gap-2 glass-panel relative">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden h-10 w-10 -ml-1 inline-flex items-center justify-center rounded-lg text-primary hud-border shrink-0"
              aria-label="Abrir conversas"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div
            className="w-2 h-2 rounded-full pulse-dot"
            style={{ background: "var(--success)", color: "var(--success)" }}
          />
          <span
            className="text-[13px] font-semibold tracking-[0.28em] text-foreground text-glow-cyan"
            style={{ fontFamily: "var(--font-display)" }}
          >
            J.A.R.V.I.S
          </span>
          <span
            className="hidden sm:inline text-[9px] uppercase tracking-[0.22em] rounded-full px-2 py-0.5 font-semibold"
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

        <div className="hidden md:flex gap-1">
          {["All", "Files", "Activity", "Stats"].map((tab) => {
            const key = tab.toLowerCase();
            const active = activeTab === key;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "text-[11px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-lg font-semibold transition-all",
                  active
                    ? "bg-primary/10 text-primary hud-border"
                    : "text-muted-foreground hover:text-primary",
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline text-[11px] text-muted-foreground uppercase tracking-[0.15em]" style={{ fontFamily: "var(--font-display)" }}>{modelLabel}</span>
          <div
            className="text-[10px] rounded-md px-2 py-0.5 font-bold tracking-[0.22em]"
            style={{
              fontFamily: "var(--font-display)",
              color: settings.modelMode === "auto" ? "var(--accent-cyan)" : "var(--premium)",
              background:
                settings.modelMode === "auto"
                  ? "color-mix(in oklab, var(--accent-cyan) 12%, transparent)"
                  : "color-mix(in oklab, var(--premium) 14%, transparent)",
              border: `1px solid ${
                settings.modelMode === "auto"
                  ? "color-mix(in oklab, var(--accent-cyan) 30%, transparent)"
                  : "color-mix(in oklab, var(--premium) 35%, transparent)"
              }`,
              boxShadow: settings.modelMode === "auto" ? "0 0 12px rgba(62,230,255,0.25)" : "0 0 12px rgba(192,132,252,0.25)",
            }}
          >
            {settings.modelMode === "auto" ? "AUTO" : "PRO"}
          </div>
        </div>
        {/* HUD scan line accent */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(62,230,255,0.5), transparent)" }} />
      </header>


      <div ref={scrollerRef} className="flex-1 overflow-y-auto scroll-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6 focus-column">
            {/* Arc Reactor orb */}
            <div className="relative h-40 w-40 mb-8 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full spin-ring"
                style={{
                  border: "1px dashed rgba(62,230,255,0.25)",
                  maskImage: "conic-gradient(from 0deg, transparent 0deg, black 60deg, black 300deg, transparent 360deg)",
                }}
              />
              <div
                className="absolute inset-3 rounded-full spin-ring-reverse"
                style={{ border: "1px solid rgba(62,230,255,0.18)" }}
              />
              <div
                className="absolute inset-6 rounded-full"
                style={{ border: "1px solid rgba(62,230,255,0.12)" }}
              />
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center text-white text-[26px] font-bold relative float-up"
                style={{
                  fontFamily: "var(--font-display)",
                  background: "var(--gradient-arc)",
                  boxShadow: "var(--glow-cyan-strong), inset 0 0 24px rgba(255,255,255,0.25)",
                  animation: "orbPulse 3s ease-in-out infinite",
                }}
              >
                J
              </div>
            </div>
            <div
              className="text-[10px] uppercase tracking-[0.4em] text-primary/70 mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              · System Online ·
            </div>
            <h1
              className="text-[26px] md:text-[30px] tracking-[-0.01em] text-center text-foreground text-glow-cyan"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              {greet()}, {greetingName || "Tony"}.
            </h1>
            <p className="text-[14px] text-muted-foreground text-center mt-2 mb-10">
              How can I assist you today?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="group text-left text-[13px] text-foreground/85 px-4 py-3.5 rounded-xl glass-panel hover:hud-border hover:text-[#3ee6ff] transition-all hover:-translate-y-0.5"
                  style={{ animation: `messageIn 0.4s ${0.1 + i * 0.06}s both` }}
                >
                  <span className="opacity-50 mr-2 font-mono text-[10px]">0{i + 1}</span>
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground uppercase tracking-[0.15em]" style={{ fontFamily: "var(--font-display)" }}>
              <span>◈ Voice</span>
              <span>◈ Files</span>
              <span>◈ {skills.length} Skills</span>
              <span>◈ Auto Router</span>
            </div>
          </div>
        ) : (
          <div className="focus-column px-4 md:px-6 py-6 flex flex-col gap-5">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} generatedFiles={generatedFiles[m.id]} />
            ))}
            {status === "submitted" && (
              <div className="text-[11px] text-primary/80 pl-11 flex items-center gap-2 uppercase tracking-[0.2em]" style={{ fontFamily: "var(--font-display)" }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="ml-1">Processing</span>
              </div>
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

      {files.length > 0 && (
        <div className="px-5 py-2 border-t border-border flex flex-wrap gap-2 max-h-[88px] overflow-y-auto scroll-thin">
          {files.map((f) => {
            const isReady = f.status === "analyzed";
            const isErr = f.status === "error";
            const tag = (f.kind ?? f.type).toString().toUpperCase().slice(0, 4);
            return (
              <div
                key={f.name}
                className="group flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg text-[11px]"
                style={{
                  background: isErr
                    ? "color-mix(in oklab, var(--destructive) 10%, transparent)"
                    : "color-mix(in oklab, var(--accent-cyan) 8%, transparent)",
                  border: `1px solid ${
                    isErr
                      ? "color-mix(in oklab, var(--destructive) 35%, transparent)"
                      : isReady
                        ? "color-mix(in oklab, var(--accent-cyan) 28%, transparent)"
                        : "color-mix(in oklab, var(--warning) 35%, transparent)"
                  }`,
                  color: "var(--foreground)",
                  maxWidth: 280,
                }}
                title={
                  isErr
                    ? `Erro: ${f.errorMsg ?? "falha"}`
                    : f.status === "analyzing"
                      ? "A ler conteúdo…"
                      : `${f.size}${f.wordCount ? ` · ${f.wordCount}w` : ""}${
                          f.pageCount ? ` · ${f.pageCount}p` : ""
                        }`
                }
              >
                <span
                  className="font-bold tracking-wider"
                  style={{ color: "var(--accent-cyan)", fontSize: 9 }}
                >
                  {tag}
                </span>
                <span className="truncate max-w-[160px]">{f.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {f.status === "analyzing"
                    ? "a ler…"
                    : isErr
                      ? "erro"
                      : f.size}
                </span>
                {onRemoveFile && (
                  <button
                    onClick={() => onRemoveFile(f.name)}
                    className="opacity-60 hover:opacity-100 ml-0.5 p-0.5 rounded hover:bg-white/5"
                    title="Remover"
                    aria-label={`Remover ${f.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isDragging && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{
            background: "color-mix(in oklab, var(--accent-cyan) 10%, rgba(10,10,15,0.85))",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="rounded-2xl px-10 py-12 text-center"
            style={{
              border: "2px dashed var(--accent-cyan)",
              background: "color-mix(in oklab, var(--accent-cyan) 6%, transparent)",
              boxShadow: "0 0 60px color-mix(in oklab, var(--accent-cyan) 35%, transparent)",
              animation: "orbPulse 1.6s ease-in-out infinite",
            }}
          >
            <div className="text-5xl mb-3">📂</div>
            <div
              className="text-[18px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-display)" }}
            >
              Largar ficheiros aqui
            </div>
            <div className="text-[12px] text-muted-foreground mt-2">
              PDF · DOCX · XLSX · PPTX · TXT · MD · Código · Imagens · Áudio
            </div>
          </div>
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
