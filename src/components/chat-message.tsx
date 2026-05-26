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
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-semibold"
        style={{
          background: isUser
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg, #00d4ff, #7c3aed)",
          color: isUser ? "#9ca3af" : "#fff",
          border: isUser ? "1px solid rgba(0,212,255,0.12)" : "none",
        }}
      >
        {isUser ? "T" : "J"}
      </div>
      <div className={cn("max-w-[72%] flex flex-col gap-1", isUser && "items-end")}>
        <div
          className="px-4 py-3 text-[13px] leading-7"
          style={{
            background: isUser ? "rgba(0,212,255,0.08)" : "#1a1a24",
            border: `1px solid ${isUser ? "rgba(0,212,255,0.2)" : "rgba(0,212,255,0.12)"}`,
            borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
            color: "#e8eaf0",
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
