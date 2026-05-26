import { MessageSquare, FolderOpen, BarChart3, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  active: string;
  onSelect: (key: string) => void;
  onNewChat: () => void;
}

const ITEMS = [
  { key: "chat", icon: MessageSquare, label: "Chat" },
  { key: "files", icon: FolderOpen, label: "Files" },
  { key: "stats", icon: BarChart3, label: "Stats" },
  { key: "settings", icon: Settings, label: "Settings" },
];

export function JarvisSidebar({ active, onSelect, onNewChat }: Props) {
  return (
    <aside className="w-14 shrink-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col items-center pt-4 gap-1">
      <div
        className="h-8 w-8 rounded-lg mb-3 flex items-center justify-center text-white text-[14px] font-bold tracking-tight"
        style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
      >
        J
      </div>

      <button
        onClick={onNewChat}
        title="New conversation"
        className="h-10 w-10 rounded-[10px] flex items-center justify-center text-muted-foreground hover:bg-[rgba(0,212,255,0.06)] hover:text-foreground transition-colors mb-1"
      >
        <Plus className="h-[18px] w-[18px]" />
      </button>

      {ITEMS.map((it) => {
        const Icon = it.icon;
        const isActive = it.key === active;
        return (
          <button
            key={it.key}
            onClick={() => onSelect(it.key)}
            title={it.label}
            className={cn(
              "h-10 w-10 rounded-[10px] flex items-center justify-center transition-colors",
              isActive
                ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff]"
                : "text-muted-foreground hover:bg-[rgba(0,212,255,0.06)] hover:text-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        );
      })}

      <div className="flex-1" />
      <div
        className="h-7 w-7 rounded-full mb-3 flex items-center justify-center text-[10px] font-semibold text-[#00d4ff] border"
        style={{
          background: "linear-gradient(135deg, #3a3a5c, #2a2a40)",
          borderColor: "rgba(0,212,255,0.12)",
        }}
      >
        TS
      </div>
    </aside>
  );
}
