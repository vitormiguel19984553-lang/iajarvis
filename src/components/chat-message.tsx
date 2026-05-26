import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";
import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

function partsToText(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = partsToText(message);

  return (
    <div className="flex gap-4 px-6 py-5">
      <div
        className={cn(
          "h-8 w-8 shrink-0 rounded-md inline-flex items-center justify-center text-[12px] font-medium border",
          isUser
            ? "bg-elevated text-foreground border-border"
            : "bg-primary text-primary-foreground border-primary",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="text-[12px] font-medium text-muted-foreground mb-1">
          {isUser ? "You" : "Lumen"}
        </div>
        {text ? (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        ) : (
          <div className="pt-1">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>
    </div>
  );
}
