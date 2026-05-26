import { useEffect, useRef, useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ChatMessage } from "@/components/chat-message";
import { JarvisVoiceBar } from "@/components/jarvis-voice-bar";
import type { Thread } from "@/lib/use-threads";
import { cn } from "@/lib/utils";

interface Props {
  thread: Thread;
  onMessagesChange: (messages: UIMessage[]) => void;
  onFirstUserMessage: (text: string) => void;
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

export function ChatWindow({ thread, onMessagesChange, onFirstUserMessage }: Props) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("voice");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport,
  });

  useEffect(() => {
    onMessagesChange(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  const submit = async () => {
    const text = input.trim();
    if (!text || isBusy) return;
    if (messages.length === 0) onFirstUserMessage(text);
    setInput("");
    await sendMessage({ text });
  };

  return (
    <div className="flex flex-col h-full min-w-0 flex-1 bg-background">
      {/* Top nav bar */}
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
          {["Voice", "Files", "Activity"].map((tab) => {
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
          <span className="text-[12px] text-muted-foreground">Model: Gemini 3 Flash</span>
          <div
            className="text-[11px] rounded-md px-2 py-0.5 font-semibold tracking-wider"
            style={{
              color: "#00d4ff",
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.12)",
            }}
          >
            PRO
          </div>
        </div>
      </header>

      {/* Messages */}
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
              {greet()}, Tony.
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
              <span>🧠 Persistent memory</span>
              <span>⚡ Real-time thinking</span>
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
      />
    </div>
  );
}
