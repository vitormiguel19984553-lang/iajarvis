import { Plus } from "lucide-react";

const files = [
  { name: "schematics_v4.pdf", size: "4.2 MB", type: "pdf", status: "analyzed" },
  { name: "reactor_logs.csv", size: "891 KB", type: "csv", status: "analyzed" },
  { name: "armor_cad.dwg", size: "12.8 MB", type: "cad", status: "pending" },
];

const fileColors: Record<string, string> = {
  pdf: "#ef4444",
  csv: "#22c55e",
  cad: "#f59e0b",
  default: "#00d4ff",
};

const activities = [
  { label: "Parsing schematics_v4.pdf", done: true },
  { label: "Running structural analysis", done: true },
  { label: "Querying materials database", done: true },
  { label: "Generating visual overlay", active: true },
  { label: "Compiling final report" },
];

const stats: Array<[string, string]> = [
  ["Tokens used", "12,480"],
  ["Response time", "1.2s"],
  ["Files analyzed", "2 / 3"],
  ["Memory used", "3 turns"],
];

function FileIcon({ type }: { type: string }) {
  const color = fileColors[type] || fileColors.default;
  const label = { pdf: "PDF", csv: "CSV", cad: "CAD" }[type] || "FILE";
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-[9px] font-bold tracking-wider shrink-0"
      style={{
        background: `${color}1F`,
        border: `1px solid ${color}40`,
        color,
      }}
    >
      {label}
    </div>
  );
}

export function JarvisRightPanel() {
  return (
    <aside className="w-[260px] shrink-0 border-l border-border bg-sidebar flex flex-col">
      {/* Files */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase mb-2.5">
          Files
        </div>
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex gap-2.5 items-center p-2 rounded-lg bg-background border border-border hover:border-[rgba(0,212,255,0.25)] cursor-pointer transition-colors"
            >
              <FileIcon type={f.type} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-foreground truncate">
                  {f.name}
                </div>
                <div className="text-[11px] text-muted-foreground">{f.size}</div>
              </div>
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: f.status === "analyzed" ? "#22c55e" : "#f59e0b",
                }}
              />
            </div>
          ))}
          <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-muted-foreground text-[12px] hover:text-[#00d4ff] hover:border-[rgba(0,212,255,0.35)] transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add file
          </button>
        </div>
      </div>

      {/* Live activity */}
      <div className="px-4 py-3.5 flex-1 overflow-y-auto scroll-thin">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] pulse-dot" />
          <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
            Live activity
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {activities.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
              style={{
                background: a.active ? "rgba(0,212,255,0.06)" : "transparent",
                border: `1px solid ${a.active ? "rgba(0,212,255,0.15)" : "transparent"}`,
              }}
            >
              <div className="shrink-0">
                {a.done ? (
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                    style={{
                      background: "rgba(34,197,94,0.15)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      color: "#22c55e",
                    }}
                  >
                    ✓
                  </div>
                ) : a.active ? (
                  <div
                    className="w-4 h-4 rounded-full spin-ring"
                    style={{
                      border: "2px solid #00d4ff",
                      borderTopColor: "transparent",
                    }}
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border" />
                )}
              </div>
              <span
                className="text-[11px]"
                style={{
                  color: a.active ? "#e8eaf0" : "#9ca3af",
                  fontWeight: a.active ? 500 : 400,
                }}
              >
                {a.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Session stats */}
      <div className="px-4 py-3 border-t border-border flex flex-col gap-1.5">
        <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase mb-1">
          Session
        </div>
        {stats.map(([k, v]) => (
          <div key={k} className="flex justify-between text-[11px] font-mono">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-foreground font-medium">{v}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
