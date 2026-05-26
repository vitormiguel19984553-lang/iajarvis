// Shared model catalog + auto-routing heuristics.

export type ModelId =
  | "google/gemini-3-flash-preview"
  | "google/gemini-3.1-pro-preview"
  | "google/gemini-2.5-pro"
  | "google/gemini-2.5-flash"
  | "google/gemini-2.5-flash-lite"
  | "openai/gpt-5"
  | "openai/gpt-5-mini"
  | "openai/gpt-5-nano"
  | "openai/gpt-5.4"
  | "openai/gpt-5.5";

export const MODEL_CATALOG: { id: ModelId; label: string; tag: string }[] = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", tag: "default" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", tag: "reasoning" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", tag: "multimodal" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", tag: "balanced" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", tag: "cheap" },
  { id: "openai/gpt-5", label: "GPT-5", tag: "all-rounder" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", tag: "balanced" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", tag: "fast" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", tag: "reasoning" },
  { id: "openai/gpt-5.5", label: "GPT-5.5", tag: "top-reasoning" },
];

const CODE_RE = /\b(code|coding|function|bug|debug|stack|typescript|javascript|python|sql|regex|algorithm|refactor)\b|```/i;
const MATH_RE = /\b(prove|theorem|integral|derivative|equation|matrix|optimi[sz]e|complexity|reasoning)\b|\\\(|\\\[/i;
const IMAGE_RE = /\b(image|picture|photo|diagram|screenshot|attached|file|pdf|chart|graph)\b/i;
const SIMPLE_RE = /^(hi|hey|hello|ola|olá|oi|thanks|thx|ok|yes|no|sim|nao|não)[!.? ]*$/i;

/**
 * Pick the best model for a given user message + context.
 * Pure function, runs server-side.
 */
export function autoRouteModel(input: {
  lastUserText: string;
  hasFiles?: boolean;
  totalMessages?: number;
}): ModelId {
  const text = input.lastUserText || "";
  const len = text.length;

  if (SIMPLE_RE.test(text.trim()) || len < 24) {
    return "google/gemini-2.5-flash-lite";
  }
  if (CODE_RE.test(text)) {
    return "openai/gpt-5.4";
  }
  if (MATH_RE.test(text) || len > 1500) {
    return "openai/gpt-5.5";
  }
  if (input.hasFiles || IMAGE_RE.test(text)) {
    return "google/gemini-2.5-pro";
  }
  if (len > 400) {
    return "google/gemini-3.1-pro-preview";
  }
  return "google/gemini-3-flash-preview";
}
