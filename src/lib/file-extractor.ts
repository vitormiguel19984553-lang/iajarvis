// Client-side file content extraction (PDF, DOCX, XLSX/CSV, text, images, audio).
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

// Use a CDN worker so we don't need to bundle the worker file.
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch {
  /* noop */
}

export type ExtractedKind =
  | "pdf"
  | "docx"
  | "xlsx"
  | "text"
  | "image"
  | "audio"
  | "unknown";

export interface ExtractedFile {
  name: string;
  ext: string;
  kind: ExtractedKind;
  size: number;
  mimeType: string;
  content: string;
  base64?: string;
  wordCount?: number;
  pageCount?: number;
  error?: string;
}

const TEXT_EXTS = new Set([
  "txt", "md", "markdown", "json", "xml", "yaml", "yml", "log",
  "js", "jsx", "ts", "tsx", "py", "go", "rs", "java", "c", "cpp",
  "h", "hpp", "html", "css", "scss", "sh", "bash", "env", "ini", "toml",
]);

export function detectKind(file: File): ExtractedKind {
  const name = file.name.toLowerCase();
  const ext = name.split(".").pop() || "";
  const mt = file.type;
  if (mt === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  )
    return "docx";
  if (
    mt === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    ext === "xlsx" ||
    ext === "xls" ||
    ext === "csv"
  )
    return "xlsx";
  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("audio/")) return "audio";
  if (mt.startsWith("text/") || TEXT_EXTS.has(ext)) return "text";
  return "unknown";
}

export async function extractFileContent(file: File): Promise<ExtractedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "file";
  const kind = detectKind(file);
  const base = {
    name: file.name,
    ext,
    kind,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  };

  try {
    if (kind === "pdf") {
      const { text, pageCount } = await extractPDF(file);
      return { ...base, content: text, pageCount, wordCount: countWords(text) };
    }
    if (kind === "docx") {
      const text = await extractDOCX(file);
      return { ...base, content: text, wordCount: countWords(text) };
    }
    if (kind === "xlsx") {
      const text = await extractXLSX(file);
      return { ...base, content: text };
    }
    if (kind === "text") {
      const text = await readText(file);
      return { ...base, content: text, wordCount: countWords(text) };
    }
    if (kind === "image") {
      const base64 = await readBase64(file);
      return {
        ...base,
        content: `[Imagem: ${file.name} — ${Math.round(file.size / 1024)}KB]`,
        base64,
      };
    }
    if (kind === "audio") {
      const base64 = await readBase64(file);
      return {
        ...base,
        content: `[Áudio: ${file.name} — ${Math.round(file.size / 1024)}KB]`,
        base64,
      };
    }
    return {
      ...base,
      content: `[Ficheiro: ${file.name} — tipo .${ext} não suportado para leitura]`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ...base,
      content: `[Erro a processar ${file.name}: ${msg}]`,
      error: msg,
    };
  }
}

function countWords(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

async function extractPDF(file: File): Promise<{ text: string; pageCount: number }> {
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const pageText = tc.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");
    out += `\n--- Página ${i} ---\n${pageText}`;
  }
  return { text: out.trim(), pageCount: pdf.numPages };
}

async function extractDOCX(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  const r = await mammoth.extractRawText({ arrayBuffer: ab });
  return r.value;
}

async function extractXLSX(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });
  let out = "";
  for (const name of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
    out += `\n=== Folha: ${name} ===\n${csv}`;
  }
  return out.trim();
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string) || "");
    r.onerror = () => reject(new Error("read error"));
    r.readAsText(file, "UTF-8");
  });
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = (r.result as string) || "";
      resolve(s.split(",")[1] || "");
    };
    r.onerror = () => reject(new Error("read error"));
    r.readAsDataURL(file);
  });
}
