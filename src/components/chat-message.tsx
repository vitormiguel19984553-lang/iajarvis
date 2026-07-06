import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";
import { Copy, RefreshCw, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileDownloadCard } from "@/components/file-download-card";
import { stripFileTags, type GeneratedFile } from "@/lib/file-generator";
import { toast } from "sonner";

function partsToText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

interface Props {
  message: UIMessage;
  generatedFiles?: GeneratedFile[];
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newText: string) => void;
}

export function ChatMessage({
  message,
  generatedFiles,
  isLastAssistant,
  onRegenerate,
  onEdit,
}: Props) {
  const isUser = message.role === "user";
  const rawText = partsToText(message);
  const text = isUser ? rawText : stripFileTags(rawText);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className={cn("msg-in group flex gap-3", isUser && "flex-row-reverse")}>
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
      <div className={cn("max-w-[72%] flex flex-col gap-1.5", isUser && "items-end")}>
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
          {editing ? (
            <div className="flex flex-col gap-2 min-w-[240px]">
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (draft.trim() && onEdit) {
                      onEdit(draft.trim());
                      setEditing(false);
                    }
                  } else if (e.key === "Escape") {
                    setEditing(false);
                    setDraft(text);
                  }
                }}
                rows={Math.min(8, Math.max(2, draft.split("\n").length))}
                className="w-full bg-background/60 border border-border/60 rounded-md px-2 py-1.5 text-[13px] resize-y outline-none focus:border-primary/50"
              />
              <div className="flex gap-1.5 justify-end text-[11px]">
                <button
                  onClick={() => { setEditing(false); setDraft(text); }}
                  className="px-2 py-1 rounded-md border border-border hover:text-destructive flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Cancelar
                </button>
                <button
                  onClick={() => {
                    if (draft.trim() && onEdit) {
                      onEdit(draft.trim());
                      setEditing(false);
                    }
                  }}
                  disabled={!draft.trim() || draft.trim() === text}
                  className="px-2 py-1 rounded-md bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25 flex items-center gap-1 disabled:opacity-40"
                >
                  <Check className="h-3 w-3" /> Reenviar
                </button>
              </div>
            </div>
          ) : text ? (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          ) : generatedFiles && generatedFiles.length > 0 ? null : (
            <div>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
          {!isUser && generatedFiles && generatedFiles.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {generatedFiles.map((f) => (
                <FileDownloadCard key={f.id} file={f} />
              ))}
            </div>
          )}
        </div>

        {!editing && text && (
          <div
            className={cn(
              "flex gap-1 text-[10.5px] text-muted-foreground opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity",
              isUser && "flex-row-reverse",
            )}
          >
            <button
              onClick={copy}
              className="h-6 px-1.5 rounded-md hover:bg-white/5 hover:text-primary flex items-center gap-1"
              title="Copiar"
              aria-label="Copiar mensagem"
            >
              <Copy className="h-3 w-3" /> Copiar
            </button>
            {isUser && onEdit && (
              <button
                onClick={() => { setDraft(text); setEditing(true); }}
                className="h-6 px-1.5 rounded-md hover:bg-white/5 hover:text-primary flex items-center gap-1"
                title="Editar e reenviar"
              >
                <Pencil className="h-3 w-3" /> Editar
              </button>
            )}
            {!isUser && isLastAssistant && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="h-6 px-1.5 rounded-md hover:bg-white/5 hover:text-primary flex items-center gap-1"
                title="Regenerar resposta"
              >
                <RefreshCw className="h-3 w-3" /> Regenerar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
