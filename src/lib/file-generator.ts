// Detects [GERAR_ARQUIVO:name.ext] ... [/GERAR_ARQUIVO] blocks in assistant
// text and turns them into downloadable Blob URLs (PDF/DOCX/XLSX/CSV/JSON/TXT/code).
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import * as XLSX from "xlsx";
import pptxgen from "pptxgenjs";
import { saveAs } from "file-saver";

export interface GeneratedFile {
  id: string;
  name: string;
  ext: string;
  blob: Blob;
  url: string;
  size: number;
}

export interface FileRequest {
  fileName: string;
  content: string;
  raw: string;
}

const FILE_TAG_RE = /\[GERAR_ARQUIVO:([^\]]+)\]([\s\S]*?)\[\/GERAR_ARQUIVO\]/g;
const IMAGE_TAG_RE = /\[GERAR_IMAGEM:([\s\S]*?)\](?:([\s\S]*?)\[\/GERAR_IMAGEM\])?/g;

export interface ImageRequest {
  prompt: string;
  raw: string;
}

export function detectFileRequests(text: string): FileRequest[] {
  const out: FileRequest[] = [];
  let m: RegExpExecArray | null;
  FILE_TAG_RE.lastIndex = 0;
  while ((m = FILE_TAG_RE.exec(text)) !== null) {
    out.push({ fileName: m[1].trim(), content: m[2].trim(), raw: m[0] });
  }
  return out;
}

export function detectImageRequests(text: string): ImageRequest[] {
  const out: ImageRequest[] = [];
  let m: RegExpExecArray | null;
  IMAGE_TAG_RE.lastIndex = 0;
  while ((m = IMAGE_TAG_RE.exec(text)) !== null) {
    const prompt = `${m[1] ?? ""} ${m[2] ?? ""}`.trim();
    if (prompt) out.push({ prompt, raw: m[0] });
  }
  return out;
}

export function stripFileTags(text: string): string {
  return text.replace(FILE_TAG_RE, "").replace(IMAGE_TAG_RE, "").trim();
}


export async function generateFile(fileName: string, content: string): Promise<GeneratedFile> {
  const ext = (fileName.split(".").pop() || "txt").toLowerCase();
  let blob: Blob;
  switch (ext) {
    case "pdf":
      blob = await makePDF(content);
      break;
    case "docx":
      blob = await makeDOCX(content);
      break;
    case "xlsx":
    case "xls":
      blob = makeXLSX(content);
      break;
    case "pptx":
      blob = await makePPTX(content);
      break;
    case "csv":
      blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      break;
    case "json":
      blob = new Blob([stripCodeFences(content)], { type: "application/json" });
      break;
    default:
      blob = new Blob([stripCodeFences(content)], { type: "text/plain;charset=utf-8;" });
  }
  const url = URL.createObjectURL(blob);
  return {
    id: `${fileName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: fileName,
    ext,
    blob,
    url,
    size: blob.size,
  };
}

export function downloadGenerated(file: GeneratedFile): void {
  saveAs(file.blob, file.name);
}

function stripCodeFences(s: string): string {
  return s.replace(/```[a-zA-Z0-9_-]*\n?/g, "").replace(/```/g, "").trim();
}

async function makePDF(content: string): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, 210, 297, "F");

  doc.setTextColor(0, 212, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("J.A.R.V.I.S", 105, 20, { align: "center" });

  doc.setTextColor(150, 200, 255);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-PT")}`, 105, 28, { align: "center" });

  doc.setDrawColor(0, 212, 255);
  doc.setLineWidth(0.4);
  doc.line(20, 32, 190, 32);

  doc.setTextColor(224, 240, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const clean = content
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```[a-zA-Z0-9_-]*\n?/g, "").replace(/```/g, ""))
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/(^|\s)\*(\S)/g, "$1$2")
    .replace(/`/g, "");

  const lines = doc.splitTextToSize(clean, 170) as string[];
  let y = 45;
  for (const line of lines) {
    if (y > 275) {
      doc.addPage();
      doc.setFillColor(10, 10, 15);
      doc.rect(0, 0, 210, 297, "F");
      doc.setTextColor(224, 240, 255);
      y = 20;
    }
    doc.text(line, 20, y);
    y += 6;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(0, 212, 255);
    doc.setFontSize(8);
    doc.text(`J.A.R.V.I.S — Página ${i} de ${pages}`, 105, 290, { align: "center" });
  }

  return doc.output("blob");
}

async function makeDOCX(content: string): Promise<Blob> {
  const paragraphs = content
    .split("\n")
    .map((line) =>
      new Paragraph({
        children: [new TextRun({ text: line || " ", size: 24, font: "Calibri" })],
        spacing: { after: 160 },
      }),
    );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "J.A.R.V.I.S", bold: true, size: 36, color: "00D4FF" }),
            ],
            spacing: { after: 240 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Gerado em: ${new Date().toLocaleString("pt-PT")}`,
                size: 18,
                color: "888888",
              }),
            ],
            spacing: { after: 360 },
          }),
          ...paragraphs,
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}

function makeXLSX(content: string): Blob {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const data = lines.map((line) => line.split(",").map((c) => c.trim()));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "JARVIS");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function makePPTX(content: string): Promise<Blob> {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.defineSlideMaster({
    title: "JARVIS_DARK",
    background: { color: "0A0A0F" },
    objects: [
      {
        text: {
          text: "J.A.R.V.I.S",
          options: {
            x: 0.4, y: 0.2, w: 4, h: 0.3,
            fontSize: 10, color: "00D4FF", bold: true, fontFace: "Arial",
          },
        },
      },
    ],
  });

  // Split content into slides via lines starting with "# " or blank-line groups.
  const blocks = content
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const slides = blocks.length > 0 ? blocks : [content || "Slide"];

  for (let i = 0; i < slides.length; i++) {
    const block = slides[i];
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const titleLine = (lines[0] ?? `Slide ${i + 1}`).replace(/^#+\s*/, "");
    const body = lines.slice(1).map((l) => l.replace(/^[-*]\s+/, "• "));
    const slide = pres.addSlide({ masterName: "JARVIS_DARK" });
    slide.addText(titleLine, {
      x: 0.5, y: 0.5, w: 12.3, h: 1,
      fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Arial",
    });
    if (body.length > 0) {
      slide.addText(body.join("\n"), {
        x: 0.6, y: 1.7, w: 12.1, h: 5.3,
        fontSize: 18, color: "E0F0FF", fontFace: "Arial",
        valign: "top",
      });
    }
    slide.addText(`${i + 1} / ${slides.length}`, {
      x: 12, y: 7.1, w: 1, h: 0.3,
      fontSize: 9, color: "00D4FF", align: "right",
    });
  }

  const data = (await pres.write({ outputType: "blob" })) as Blob;
  return data;
}
