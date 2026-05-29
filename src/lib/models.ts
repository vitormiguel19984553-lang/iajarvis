// 28-model catalog with plan tiers and gateway fallback.
// Some models (Claude, Llama, Grok, DeepSeek, Mistral, Perplexity, Qwen, Cohere)
// are not natively served by the Lovable AI Gateway today, so we keep them in
// the UI for transparency but route to a near-equivalent gateway model at
// runtime (see GATEWAY_FALLBACK below).

export type PlanTier = "free" | "pro" | "ultra";

export type ModelCategory =
  | "platform"
  | "openai"
  | "anthropic"
  | "google"
  | "meta"
  | "xai"
  | "mistral"
  | "deepseek"
  | "perplexity"
  | "alibaba"
  | "cohere"
  | "creative";

export type ModelDef = {
  id: string; // display id (also used in settings.manualModel)
  label: string;
  category: ModelCategory;
  provider: string;
  minPlan: PlanTier;
  tag: string;
  isNew?: boolean;
  /**
   * Real Lovable AI Gateway model id used at runtime. When the catalog id
   * already matches a gateway id, leave undefined.
   */
  gatewayId?: string;
};

export const CATEGORY_LABEL: Record<ModelCategory, string> = {
  platform: "Plataforma",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  meta: "Meta",
  xai: "xAI",
  mistral: "Mistral",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
  alibaba: "Alibaba",
  cohere: "Cohere",
  creative: "Criativo",
};

export const PLAN_RANK: Record<PlanTier, number> = { free: 0, pro: 1, ultra: 2 };

export const MODEL_CATALOG: ModelDef[] = [
  // Plataforma
  { id: "auto", label: "J.A.R.V.I.S Auto Router", category: "platform", provider: "Lovable", minPlan: "free", tag: "smart routing", isNew: true, gatewayId: "google/gemini-3-flash-preview" },

  // Google (free + pro)
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", category: "google", provider: "Google", minPlan: "free", tag: "fast • default", isNew: true },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", category: "google", provider: "Google", minPlan: "free", tag: "cheapest" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", category: "google", provider: "Google", minPlan: "free", tag: "balanced" },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", category: "google", provider: "Google", minPlan: "pro", tag: "agentic" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", category: "google", provider: "Google", minPlan: "pro", tag: "reasoning", isNew: true },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", category: "google", provider: "Google", minPlan: "pro", tag: "multimodal" },

  // OpenAI
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", category: "openai", provider: "OpenAI", minPlan: "free", tag: "fast" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", category: "openai", provider: "OpenAI", minPlan: "free", tag: "balanced" },
  { id: "openai/gpt-5", label: "GPT-5", category: "openai", provider: "OpenAI", minPlan: "pro", tag: "all-rounder" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", category: "openai", provider: "OpenAI", minPlan: "pro", tag: "code & reasoning" },
  { id: "openai/gpt-5.4-pro", label: "GPT-5.4 Pro", category: "openai", provider: "OpenAI", minPlan: "ultra", tag: "premium reasoning" },
  { id: "openai/gpt-5.5", label: "GPT-5.5", category: "openai", provider: "OpenAI", minPlan: "ultra", tag: "top reasoning" },
  { id: "openai/gpt-5.5-pro", label: "GPT-5.5 Pro", category: "openai", provider: "OpenAI", minPlan: "ultra", tag: "frontier", isNew: true },

  // Anthropic (fallback)
  { id: "anthropic/claude-haiku", label: "Claude Haiku", category: "anthropic", provider: "Anthropic", minPlan: "pro", tag: "fast • fallback", gatewayId: "google/gemini-2.5-flash" },
  { id: "anthropic/claude-sonnet", label: "Claude Sonnet", category: "anthropic", provider: "Anthropic", minPlan: "pro", tag: "balanced • fallback", gatewayId: "openai/gpt-5" },
  { id: "anthropic/claude-opus", label: "Claude Opus", category: "anthropic", provider: "Anthropic", minPlan: "ultra", tag: "top • fallback", gatewayId: "openai/gpt-5.5" },

  // Meta (fallback)
  { id: "meta/llama-3.3-70b", label: "Llama 3.3 70B", category: "meta", provider: "Meta", minPlan: "pro", tag: "open • fallback", gatewayId: "google/gemini-2.5-flash" },
  { id: "meta/llama-4-maverick", label: "Llama 4 Maverick", category: "meta", provider: "Meta", minPlan: "ultra", tag: "large • fallback", gatewayId: "openai/gpt-5" },

  // xAI (fallback)
  { id: "xai/grok-3", label: "Grok 3", category: "xai", provider: "xAI", minPlan: "pro", tag: "witty • fallback", gatewayId: "openai/gpt-5" },
  { id: "xai/grok-4", label: "Grok 4", category: "xai", provider: "xAI", minPlan: "ultra", tag: "advanced • fallback", gatewayId: "openai/gpt-5.5" },

  // DeepSeek (fallback)
  { id: "deepseek/deepseek-v3", label: "DeepSeek V3", category: "deepseek", provider: "DeepSeek", minPlan: "pro", tag: "code • fallback", gatewayId: "openai/gpt-5.4" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1", category: "deepseek", provider: "DeepSeek", minPlan: "ultra", tag: "reasoning • fallback", gatewayId: "openai/gpt-5.5" },

  // Mistral (fallback)
  { id: "mistral/mistral-large", label: "Mistral Large", category: "mistral", provider: "Mistral", minPlan: "pro", tag: "EU • fallback", gatewayId: "google/gemini-2.5-pro" },

  // Perplexity (fallback)
  { id: "perplexity/sonar-large", label: "Perplexity Sonar", category: "perplexity", provider: "Perplexity", minPlan: "pro", tag: "search • fallback", gatewayId: "google/gemini-2.5-flash" },

  // Alibaba (fallback)
  { id: "alibaba/qwen-2.5-max", label: "Qwen 2.5 Max", category: "alibaba", provider: "Alibaba", minPlan: "pro", tag: "multilingual • fallback", gatewayId: "google/gemini-2.5-flash" },

  // Cohere (fallback)
  { id: "cohere/command-r-plus", label: "Command R+", category: "cohere", provider: "Cohere", minPlan: "pro", tag: "RAG • fallback", gatewayId: "google/gemini-2.5-flash" },

  // Criativo (image)
  { id: "google/gemini-2.5-flash-image", label: "Nano Banana (Image)", category: "creative", provider: "Google", minPlan: "ultra", tag: "image gen" },
];

export type ModelId = string;

export function getModel(id: string): ModelDef | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

export function resolveGatewayId(id: string): string {
  const m = getModel(id);
  if (!m) return "google/gemini-3-flash-preview";
  return m.gatewayId ?? m.id;
}

export function canUseModel(plan: PlanTier, id: string): boolean {
  const m = getModel(id);
  if (!m) return false;
  return PLAN_RANK[plan] >= PLAN_RANK[m.minPlan];
}

// ───────────────────────────── Auto router ─────────────────────────────

const CODE_RE = /\b(code|coding|function|bug|debug|stack|typescript|javascript|python|sql|regex|algorithm|refactor)\b|```/i;
const MATH_RE = /\b(prove|theorem|integral|derivative|equation|matrix|optimi[sz]e|complexity|reasoning)\b|\\\(|\\\[/i;
const IMAGE_RE = /\b(image|picture|photo|diagram|screenshot|attached|file|pdf|chart|graph|generate.*image|draw)\b/i;
const SIMPLE_RE = /^(hi|hey|hello|ola|olá|oi|thanks|thx|ok|yes|no|sim|nao|não)[!.? ]*$/i;

/**
 * Pick the best gateway model id for a given user message + plan.
 * Always returns a real gateway id (not a fallback alias).
 */
export function autoRouteModel(input: {
  lastUserText: string;
  hasFiles?: boolean;
  totalMessages?: number;
  plan?: PlanTier;
}): string {
  const text = input.lastUserText || "";
  const len = text.length;
  const plan = input.plan ?? "free";

  if (SIMPLE_RE.test(text.trim()) || len < 24) {
    return "google/gemini-2.5-flash-lite";
  }
  if (CODE_RE.test(text)) {
    return plan === "free" ? "openai/gpt-5-mini" : "openai/gpt-5.4";
  }
  if (MATH_RE.test(text) || len > 1500) {
    return plan === "ultra" ? "openai/gpt-5.5" : plan === "pro" ? "google/gemini-3.1-pro-preview" : "google/gemini-2.5-flash";
  }
  if (input.hasFiles || IMAGE_RE.test(text)) {
    return plan === "free" ? "google/gemini-2.5-flash" : "google/gemini-2.5-pro";
  }
  if (len > 400) {
    return plan === "free" ? "google/gemini-2.5-flash" : "google/gemini-3.1-pro-preview";
  }
  return "google/gemini-3-flash-preview";
}

// Free plan daily message cap
export const FREE_DAILY_LIMIT = 50;
