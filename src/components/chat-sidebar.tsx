import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import type { Thread } from "@/lib/use-threads";
import { cn } from "@/lib/utils";

interface Props {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function ChatSidebar({
  threads,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  collapsed,
  onToggle,
}: Props) {
  return (
    <aside
      className={cn(
        "h-full shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col transition-[width] duration-200",
        collapsed ? "w-14" : "w-[260px]",
      )}
    >
      <div className="flex items-center justify-between px-3 h-12 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2 text-[14px] font-semibold">
            <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span>Lumen</span>
          </div>
        )}
        <button
          aria-label="Toggle sidebar"
          onClick={onToggle}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="p-2">
        <button
          onClick={onCreate}
          className={cn(
            "w-full inline-flex items-center gap-2 h-9 rounded-md border border-border bg-elevated text-[13px] font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            collapsed ? "justify-center px-0" : "px-3",
          )}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>New chat</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Recent
        </div>
      )}

      <nav className="flex-1 overflow-y-auto scroll-thin px-2 pb-3">
        {threads.length === 0 && !collapsed && (
          <div className="px-3 py-6 text-[13px] text-muted-foreground">
            No conversations yet.
          </div>
        )}
        <ul className="space-y-0.5">
          {threads.map((t) => {
            const active = t.id === activeId;
            return (
              <li key={t.id}>
                <div
                  className={cn(
                    "group flex items-center rounded-md text-[13px] transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-foreground/80 hover:bg-sidebar-accent/60",
                    collapsed ? "justify-center" : "px-2",
                  )}
                >
                  <button
                    onClick={() => onSelect(t.id)}
                    className={cn(
                      "flex-1 flex items-center gap-2 h-9 text-left truncate",
                      collapsed && "justify-center",
                    )}
                    title={t.title}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    {!collapsed && <span className="truncate">{t.title}</span>}
                  </button>
                  {!collapsed && (
                    <button
                      aria-label="Delete chat"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(t.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-elevated transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
          Conversations stored locally on this device.
        </div>
      )}
    </aside>
  );
}
