import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

function partsToText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = partsToText(message);

  return (
    <div className={cn("msg-in flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold"
        style={{
          fontFamily: "var(--font-display)",
          background: isUser
            ? "rgba(255,255,255,0.04)"
            : "radial-gradient(circle at 35% 30%, #4ff4ff, var(--accent-cyan) 55%, var(--accent-violet))",
          color: isUser ? "var(--muted-foreground)" : "#fff",
          border: isUser ? "1px solid var(--border)" : "none",
          boxShadow: isUser
            ? "none"
            : "0 0 14px color-mix(in oklab, var(--accent-cyan) 45%, transparent)",
        }}
      >
        {isUser ? "T" : "J"}
      </div>
      <div className={cn("max-w-[72%] flex flex-col gap-1", isUser && "items-end")}>
        <div
          className="px-4 py-3 text-[13px] leading-7"
          style={{
            background: isUser
              ? "color-mix(in oklab, var(--accent-cyan) 10%, transparent)"
              : "var(--elevated)",
            border: `1px solid ${
              isUser
                ? "color-mix(in oklab, var(--accent-cyan) 28%, transparent)"
                : "var(--border)"
            }`,
            borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
            color: "var(--foreground)",
          }}
        >
          {text ? (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          ) : (
            <div>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
