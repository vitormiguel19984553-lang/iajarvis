import { useEffect, useRef, useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Square, Sparkles } from "lucide-react";
import { ChatMessage } from "@/components/chat-message";
import type { Thread } from "@/lib/use-threads";

interface Props {
  thread: Thread;
  onMessagesChange: (messages: UIMessage[]) => void;
  onFirstUserMessage: (text: string) => void;
}

const SUGGESTIONS = [
  "Explain quantum entanglement like I'm five",
  "Draft a polite follow-up email to a recruiter",
  "Plan a 3-day itinerary for Lisbon",
  "Write a SQL query to find duplicate rows",
];

export function ChatWindow({ thread, onMessagesChange, onFirstUserMessage }: Props) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport,
  });

  // Persist messages
  useEffect(() => {
    onMessagesChange(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const isBusy = status === "submitted" || status === "streaming";

  const submit = async () => {
    const text = input.trim();
    if (!text || isBusy) return;
    if (messages.length === 0) onFirstUserMessage(text);
    setInput("");
    await sendMessage({ text });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="h-12 border-b border-border flex items-center px-6 shrink-0">
        <div className="text-[13px] font-medium text-foreground truncate">{thread.title}</div>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto scroll-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6 max-w-2xl mx-auto">
            <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground inline-flex items-center justify-center mb-5">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight mb-2 text-center">
              How can I help you today?
            </h1>
            <p className="text-[14px] text-muted-foreground text-center mb-8">
              Ask anything. Lumen can explain, draft, plan, and code.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left text-[13px] text-foreground/80 px-4 py-3 rounded-lg border border-border bg-elevated hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto pb-32">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {status === "submitted" && (
              <div className="px-6 py-3 text-[12px] text-muted-foreground">Thinking…</div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background shrink-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {error && (
            <div className="mb-2 text-[12px] text-destructive">
              Something went wrong. Please try again.
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="relative flex items-end rounded-xl border border-border bg-elevated focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-all"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Message Lumen…"
              className="flex-1 bg-transparent resize-none px-4 py-3 text-[14px] leading-6 outline-none placeholder:text-muted-foreground max-h-[200px]"
            />
            <div className="p-2">
              {isBusy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  aria-label="Stop"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
                >
                  <Square className="h-3.5 w-3.5" fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
          <div className="mt-2 text-center text-[11px] text-muted-foreground">
            Lumen can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}
