// Client-side file content extraction (PDF, DOCX, XLSX/CSV, text, images, audio).
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";

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
  | "pptx"
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
  if (
    mt === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ext === "pptx"
  )
    return "pptx";
  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("audio/")) return "audio";
  if (mt.startsWith("text/") || TEXT_EXTS.has(ext)) return "text";
  return "unknown";
}

export type ProgressCallback = (percent: number) => void;

const FRIENDLY_ERRORS: Record<string, string> = {
  pdf: "Não foi possível ler o PDF. Pode estar corrompido ou protegido.",
  docx: "Não foi possível ler o DOCX. Verifica se o ficheiro não está corrompido.",
  xlsx: "Não foi possível ler a folha de cálculo.",
  pptx: "Não foi possível ler a apresentação PPTX.",
  text: "Não foi possível ler o ficheiro de texto.",
  image: "Não foi possível carregar a imagem.",
  audio: "Não foi possível carregar o áudio.",
  unknown: "Tipo de ficheiro não suportado.",
};

export async function extractFileContent(
  file: File,
  onProgress?: ProgressCallback,
): Promise<ExtractedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "file";
  const kind = detectKind(file);
  const base = {
    name: file.name,
    ext,
    kind,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  };
  onProgress?.(5);

  try {
    if (kind === "pdf") {
      const { text, pageCount, scanned } = await extractPDF(file, onProgress);
      if (scanned) {
        return {
          ...base,
          content: `[PDF "scaneado" — ${pageCount} página(s), sem texto extraível. OCR não está disponível neste ambiente.]`,
          pageCount,
          wordCount: 0,
          error: "PDF sem texto extraível (provavelmente scaneado ou só imagens)",
        };
      }
      onProgress?.(100);
      return { ...base, content: text, pageCount, wordCount: countWords(text) };
    }
    if (kind === "docx") {
      onProgress?.(40);
      const text = await extractDOCX(file);
      onProgress?.(100);
      return { ...base, content: text, wordCount: countWords(text) };
    }
    if (kind === "xlsx") {
      onProgress?.(40);
      const text = await extractXLSX(file);
      onProgress?.(100);
      return { ...base, content: text };
    }
    if (kind === "pptx") {
      const { text, slideCount } = await extractPPTX(file, onProgress);
      onProgress?.(100);
      return { ...base, content: text, pageCount: slideCount, wordCount: countWords(text) };
    }
    if (kind === "text") {
      onProgress?.(40);
      const text = await readText(file);
      onProgress?.(100);
      return { ...base, content: text, wordCount: countWords(text) };
    }
    if (kind === "image") {
      onProgress?.(40);
      const base64 = await readBase64(file);
      onProgress?.(100);
      return {
        ...base,
        content: `[Imagem: ${file.name} — ${Math.round(file.size / 1024)}KB]`,
        base64,
      };
    }
    if (kind === "audio") {
      onProgress?.(40);
      const base64 = await readBase64(file);
      onProgress?.(100);
      return {
        ...base,
        content: `[Áudio: ${file.name} — ${Math.round(file.size / 1024)}KB]`,
        base64,
      };
    }
    onProgress?.(100);
    return {
      ...base,
      content: `[Ficheiro: ${file.name} — tipo .${ext} não suportado para leitura]`,
      error: FRIENDLY_ERRORS.unknown,
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const friendly = FRIENDLY_ERRORS[kind] ?? "Erro a processar ficheiro.";
    onProgress?.(100);
    return {
      ...base,
      content: `[Erro a processar ${file.name}: ${raw}]`,
      error: `${friendly} (${raw})`,
    };
  }
}

function countWords(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

async function extractPDF(
  file: File,
  onProgress?: ProgressCallback,
): Promise<{ text: string; pageCount: number; scanned: boolean }> {
  const ab = await file.arrayBuffer();
  onProgress?.(15);
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  let out = "";
  let totalChars = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const pageText = tc.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");
    totalChars += pageText.trim().length;
    out += `\n--- Página ${i} ---\n${pageText}`;
    onProgress?.(15 + Math.round((i / pdf.numPages) * 80));
  }
  // Heuristic: <20 chars total across all pages ⇒ scanned image PDF
  const scanned = totalChars < 20;
  return { text: out.trim(), pageCount: pdf.numPages, scanned };
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

async function extractPPTX(
  file: File,
  onProgress?: ProgressCallback,
): Promise<{ text: string; slideCount: number }> {
  const ab = await file.arrayBuffer();
  onProgress?.(20);
  const zip = await JSZip.loadAsync(ab);
  const slideFiles = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)?.[1] ?? "0", 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/)?.[1] ?? "0", 10);
      return na - nb;
    });
  let out = "";
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const texts: string[] = [];
    const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const t = m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      if (t.trim()) texts.push(t);
    }
    out += `\n--- Slide ${i + 1} ---\n${texts.join("\n")}`;
    onProgress?.(20 + Math.round(((i + 1) / slideFiles.length) * 75));
  }
  return { text: out.trim(), slideCount: slideFiles.length };
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
