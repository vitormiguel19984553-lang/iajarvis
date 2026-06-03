import { useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { downloadGenerated, type GeneratedFile } from "@/lib/file-generator";

const ICONS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOC",
  xlsx: "XLS",
  xls: "XLS",
  csv: "CSV",
  json: "JSON",
  txt: "TXT",
  py: "PY",
  js: "JS",
  ts: "TS",
  tsx: "TSX",
  html: "HTML",
  css: "CSS",
};

const COLORS: Record<string, string> = {
  pdf: "#ef4444",
  docx: "#3b82f6",
  xlsx: "#22c55e",
  xls: "#22c55e",
  csv: "#22c55e",
  json: "#f59e0b",
  txt: "#9ca3af",
};

export function FileDownloadCard({ file }: { file: GeneratedFile }) {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const color = COLORS[file.ext] || "#00d4ff";
  const label = ICONS[file.ext] || file.ext.slice(0, 4).toUpperCase();
  const sizeKB = Math.max(1, Math.round(file.size / 1024));

  const handle = async () => {
    setDownloading(true);
    try {
      downloadGenerated(file);
      setDone(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="my-2 flex items-center gap-3 p-3 rounded-xl"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 8%, transparent), color-mix(in oklab, ${color} 2%, transparent))`,
        border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
        boxShadow: `0 0 18px color-mix(in oklab, ${color} 18%, transparent)`,
      }}
    >
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center text-[10px] font-bold tracking-wider shrink-0"
        style={{
          background: `color-mix(in oklab, ${color} 16%, transparent)`,
          border: `1px solid color-mix(in oklab, ${color} 45%, transparent)`,
          color,
          fontFamily: "var(--font-display)",
        }}
      >
        {label}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] font-semibold text-foreground truncate"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}
        >
          {file.name}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
          <span>{file.ext.toUpperCase()}</span>
          <span>·</span>
          <span>{sizeKB} KB</span>
          {done && (
            <span style={{ color: "var(--success, #22c55e)" }}>· transferido</span>
          )}
        </div>
      </div>
      <button
        onClick={handle}
        disabled={downloading}
        className="px-3 h-9 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold transition-all disabled:opacity-60"
        style={{
          background: done
            ? `color-mix(in oklab, var(--success, #22c55e) 14%, transparent)`
            : `color-mix(in oklab, ${color} 14%, transparent)`,
          border: `1px solid ${done ? "color-mix(in oklab, var(--success, #22c55e) 45%, transparent)" : `color-mix(in oklab, ${color} 45%, transparent)`}`,
          color: done ? "var(--success, #22c55e)" : color,
          fontFamily: "var(--font-display)",
          letterSpacing: "0.05em",
        }}
      >
        {downloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : done ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {downloading ? "..." : done ? "OK" : "Baixar"}
      </button>
    </div>
  );
}
