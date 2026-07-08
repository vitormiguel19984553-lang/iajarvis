import { MessageSquare, FolderOpen, BarChart3, Settings, Plus, History, User, Shield, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  active: string;
  onSelect: (key: string) => void;
  onNewChat: () => void;
  onToggleHistory: () => void;
  historyOpen: boolean;
  preferredName?: string | null;
  isAdmin?: boolean;
  onLogout?: () => void;
}

const ITEMS = [
  { key: "chat", icon: MessageSquare, label: "Chat" },
  { key: "files", icon: FolderOpen, label: "Ficheiros" },
  { key: "stats", icon: BarChart3, label: "Stats" },
  { key: "settings", icon: Settings, label: "Definições" },
];

export function JarvisSidebar({
  active,
  onSelect,
  onNewChat,
  onToggleHistory,
  historyOpen,
  preferredName,
  isAdmin,
  onLogout,
}: Props) {
  const initials = (preferredName ?? "JV").slice(0, 2).toUpperCase();
  return (
    <aside className="w-14 shrink-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col items-center pt-4 gap-1">
      <div
        className="h-8 w-8 rounded-lg mb-3 flex items-center justify-center text-white text-[14px] font-bold tracking-tight"
        style={{ background: "linear-gradient(135deg, #3ee6ff, #7c3aed)" }}
      >
        J
      </div>

      <button
        onClick={onNewChat}
        title="Nova conversa" aria-label="Nova conversa"
        className="h-10 w-10 rounded-[10px] flex items-center justify-center text-muted-foreground hover:bg-[rgba(62, 230, 255,0.06)] hover:text-foreground transition-colors mb-1"
      >
        <Plus className="h-[18px] w-[18px]" />
      </button>

      <button
        onClick={onToggleHistory}
        title="Conversas" aria-label="Conversas" aria-pressed={historyOpen}
        className={cn(
          "h-10 w-10 rounded-[10px] flex items-center justify-center transition-colors mb-1",
          historyOpen
            ? "bg-[rgba(62, 230, 255,0.1)] text-[#3ee6ff]"
            : "text-muted-foreground hover:bg-[rgba(62, 230, 255,0.06)] hover:text-foreground",
        )}
      >
        <History className="h-[18px] w-[18px]" />
      </button>

      {ITEMS.map((it) => {
        const Icon = it.icon;
        const isActive = it.key === active;
        return (
          <button
            key={it.key}
            onClick={() => onSelect(it.key)}
            title={it.label} aria-label={it.label} aria-current={isActive ? "page" : undefined}
            className={cn(
              "h-10 w-10 rounded-[10px] flex items-center justify-center transition-colors",
              isActive
                ? "bg-[rgba(62, 230, 255,0.1)] text-[#3ee6ff]"
                : "text-muted-foreground hover:bg-[rgba(62, 230, 255,0.06)] hover:text-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={() => onSelect("planos")}
        title="Planos" aria-label="Planos"
        className="h-10 w-10 rounded-[10px] flex items-center justify-center text-muted-foreground hover:bg-[rgba(62, 230, 255,0.06)] hover:text-[#3ee6ff] transition-colors"
      >
        <Sparkles className="h-[18px] w-[18px]" />
      </button>

      {isAdmin && (
        <button
          onClick={() => onSelect("admin")}
          title="Admin" aria-label="Admin"
          className="h-10 w-10 rounded-[10px] flex items-center justify-center text-muted-foreground hover:bg-[rgba(62, 230, 255,0.06)] hover:text-foreground transition-colors"
        >
          <Shield className="h-[18px] w-[18px]" />
        </button>
      )}

      <button
        onClick={() => onSelect("perfil")}
        title={preferredName ? `Olá, ${preferredName}` : "Perfil"} aria-label="Perfil"
        className="h-10 w-10 rounded-[10px] flex items-center justify-center text-muted-foreground hover:bg-[rgba(62, 230, 255,0.06)] hover:text-foreground transition-colors"
      >
        <User className="h-[18px] w-[18px]" />
      </button>

      {onLogout && (
        <button
          onClick={onLogout}
          title="Terminar sessão" aria-label="Terminar sessão"
          className="h-10 w-10 rounded-[10px] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[rgba(239,68,68,0.08)] transition-colors mb-1"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      )}

      <div
        className="h-7 w-7 rounded-full mb-3 flex items-center justify-center text-[10px] font-semibold text-[#3ee6ff] border"
        style={{
          background: "linear-gradient(135deg, #3a3a5c, #2a2a40)",
          borderColor: "rgba(62, 230, 255,0.12)",
        }}
        title={preferredName ?? undefined}
      >
        {initials}
      </div>
    </aside>
  );
}
