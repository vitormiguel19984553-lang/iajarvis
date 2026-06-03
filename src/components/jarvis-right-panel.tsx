import { Plus, Eye, X, Loader2 } from "lucide-react";
import { useRef } from "react";

export type UploadedFile = {
  name: string;
  size: string;
  sizeBytes: number;
  type: string; // extension
  status: "analyzed" | "pending" | "analyzing" | "error";
  mimeType: string;
  kind?: "pdf" | "docx" | "xlsx" | "text" | "image" | "audio" | "unknown";
  content?: string;
  base64?: string;
  wordCount?: number;
  pageCount?: number;
  errorMsg?: string;
};

export type Activity = {
  label: string;
  state: "done" | "active" | "pending";
};

const fileColors: Record<string, string> = {
  pdf: "#ef4444",
  csv: "#22c55e",
  xlsx: "#22c55e",
  docx: "#3b82f6",
  png: "#3b82f6",
  jpg: "#3b82f6",
  jpeg: "#3b82f6",
  webp: "#3b82f6",
  gif: "#3b82f6",
  svg: "#3b82f6",
  js: "#7c3aed",
  ts: "#7c3aed",
  tsx: "#7c3aed",
  json: "#7c3aed",
  default: "#00d4ff",
};

function FileTypeIcon({ type }: { type: string }) {
  const color = fileColors[type] || fileColors.default;
  const label = type.toUpperCase().slice(0, 4);
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

interface Props {
  section: "files" | "activity" | "stats" | "all";
  files: UploadedFile[];
  onPickFiles: (files: File[]) => void;
  onRemoveFile: (name: string) => void;
  onPreviewFile?: (name: string) => void;
  activities: Activity[];
  stats: Array<[string, string]>;
}

export function JarvisRightPanel({
  section,
  files,
  onPickFiles,
  onRemoveFile,
  onPreviewFile,
  activities,
  stats,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const show = (s: Props["section"]) => section === "all" || section === s;

  return (
    <aside className="w-[260px] shrink-0 border-l border-border bg-sidebar flex flex-col">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.csv,.json,.xml,.yaml,.yml,.log,.png,.jpg,.jpeg,.webp,.gif,.svg,.js,.ts,.tsx,.jsx,.py,.go,.rs,.java,.c,.cpp,.html,.css,.docx,.xlsx,.pptx,.mp3,.wav,.m4a"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onPickFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />

      {show("files") && (
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase mb-2.5">
            Files
          </div>
          <div className="flex flex-col gap-2">
            {files.length === 0 && (
              <div className="text-[12px] text-muted-foreground py-3 text-center">
                No files yet.
              </div>
            )}
            {files.map((f) => (
              <div
                key={f.name}
                className="group flex gap-2.5 items-center p-2 rounded-lg bg-background border border-border hover:border-[rgba(0,212,255,0.25)] transition-colors"
                title={
                  f.status === "analyzed"
                    ? `${f.wordCount ? `${f.wordCount} palavras` : ""}${f.pageCount ? ` · ${f.pageCount} páginas` : ""}`
                    : f.status === "error"
                      ? `Erro: ${f.errorMsg ?? "falha a ler"}`
                      : "A processar…"
                }
              >
                <FileTypeIcon type={f.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-foreground truncate">
                    {f.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {f.size}
                    {f.status === "analyzed" && f.wordCount
                      ? ` · ~${f.wordCount} palavras`
                      : ""}
                    {f.status === "analyzed" && f.pageCount
                      ? ` · ${f.pageCount} pág.`
                      : ""}
                    {f.status === "analyzing" ? " · a ler…" : ""}
                    {f.status === "error" ? " · erro" : ""}
                  </div>
                </div>
                {onPreviewFile && (
                  <button
                    onClick={() => onPreviewFile(f.name)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[#00d4ff] transition-opacity"
                    title="Preview"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onRemoveFile(f.name)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="shrink-0 group-hover:opacity-0 transition-opacity">
                  {f.status === "analyzing" ? (
                    <Loader2 className="h-3 w-3 animate-spin text-[#00d4ff]" />
                  ) : (
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background:
                          f.status === "analyzed"
                            ? "#22c55e"
                            : f.status === "error"
                              ? "#ef4444"
                              : "#f59e0b",
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-muted-foreground text-[12px] hover:text-[#00d4ff] hover:border-[rgba(0,212,255,0.35)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add file
            </button>
          </div>
        </div>
      )}

      {show("activity") && (
        <div className="px-4 py-3.5 flex-1 overflow-y-auto scroll-thin">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] pulse-dot" />
            <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
              Live activity
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {activities.length === 0 && (
              <div className="text-[12px] text-muted-foreground py-3 text-center">
                Idle. Activity will appear here.
              </div>
            )}
            {activities.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
                style={{
                  background: a.state === "active" ? "rgba(0,212,255,0.06)" : "transparent",
                  border: `1px solid ${a.state === "active" ? "rgba(0,212,255,0.15)" : "transparent"}`,
                }}
              >
                <div className="shrink-0">
                  {a.state === "done" ? (
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
                  ) : a.state === "active" ? (
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
                    color: a.state === "active" ? "#e8eaf0" : "#9ca3af",
                    fontWeight: a.state === "active" ? 500 : 400,
                  }}
                >
                  {a.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!show("activity") && <div className="flex-1" />}

      {show("stats") && (
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
      )}
    </aside>
  );
}
