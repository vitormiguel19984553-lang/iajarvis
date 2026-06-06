import { MessageSquare, Trash2, X } from "lucide-react";
import type { Thread } from "@/lib/use-threads";
import { cn } from "@/lib/utils";

interface Props {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function relTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function ThreadListPanel({
  threads,
  activeId,
  onSelect,
  onDelete,
  onClose,
}: Props) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="
          fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] shadow-2xl
          md:static md:w-[240px] md:max-w-none md:shadow-none md:z-auto
          shrink-0 border-r border-border bg-sidebar flex flex-col
        "
      >
        <div className="h-[52px] px-4 flex items-center justify-between border-b border-border shrink-0">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            Conversas
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors h-9 w-9 flex items-center justify-center -mr-2"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      <div className="flex-1 overflow-y-auto scroll-thin p-2">
        {threads.length === 0 ? (
          <div className="text-[12px] text-muted-foreground text-center py-6">
            No conversations yet.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {threads.map((t) => {
              const isActive = t.id === activeId;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors",
                    isActive
                      ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff]"
                      : "text-foreground/85 hover:bg-[rgba(255,255,255,0.04)]",
                  )}
                  onClick={() => onSelect(t.id)}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate">{t.title}</div>
                    <div className="text-[10.5px] text-muted-foreground">
                      {t.messages.length} msg · {relTime(t.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(t.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
