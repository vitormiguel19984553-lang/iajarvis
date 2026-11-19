import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  autoRouteModel,
  canUseModel,
  FREE_DAILY_LIMIT,
  getModel,
  resolveGatewayId,
  type PlanTier,
} from "@/lib/models";
import { createFileRoute } from "@tanstack/react-router";
import { createServerClient } from "@supabase/ssr";
import {
  convertToModelMessages,
  streamText,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { rateLimit, sweep } from "@/lib/rate-limit.server";

const MAX_MESSAGES = 80;
const MAX_TEXT_PER_MSG = 16_000;
const MAX_FILE_CONTEXT = 60_000;
const MAX_IMAGES = 6;

type ChatRequestBody = {
  messages?: unknown;
  systemPrompt?: string;
  model?: string;
  skills?: string[];
  hasFiles?: boolean;
  fileContext?: string;
  images?: Array<{ mimeType: string; base64: string }>;
  audios?: Array<{ mimeType: string; base64: string; name?: string }>;
};

const FILE_CONFIRM_RULE = `\n\nQuando o utilizador anexar ficheiros, COMEÇA SEMPRE a resposta com uma linha de confirmação no formato:\n✅ Ficheiro recebido: <nome> — <N> palavras/páginas processadas\n(uma linha por ficheiro). Só depois prossegue com a análise pedida.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const { messages, systemPrompt, model, skills, hasFiles, fileContext, images, audios } = body;


        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        if (messages.length > MAX_MESSAGES) {
          return new Response("Too many messages", { status: 413 });
        }
        for (const m of messages as UIMessage[]) {
          const parts = (m as { parts?: Array<{ type: string; text?: string }> }).parts ?? [];
          for (const p of parts) {
            if (p.type === "text" && (p.text?.length ?? 0) > MAX_TEXT_PER_MSG) {
              return new Response("Message too long", { status: 413 });
            }
          }
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        // ── Require authentication ──────────────────────────────────────
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");
        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }

        let plan: PlanTier = "free";
        let messagesToday = 0;
        let resetAt: string | null = null;

        const supabase = createServerClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            cookies: { getAll: () => [], setAll: () => {} },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );
        const { data: u, error: authErr } = await supabase.auth.getUser();
        if (authErr || !u.user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = u.user.id;

        // ── Per-user rate limit (soft, per-instance) ────────────────────
        sweep();
        const rl = rateLimit(`chat:${userId}`, 20, 60_000);
        if (!rl.ok) {
          return new Response(
            JSON.stringify({
              error: "rate_limited",
              message: "Demasiados pedidos. Aguarda alguns segundos.",
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(Math.ceil(rl.resetIn / 1000)),
              },
            },
          );
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("plan_type, plan_expires_at, messages_today, messages_reset_at, is_suspended")
          .eq("id", userId)
          .maybeSingle();
        if (profile) {
          if (profile.is_suspended) {
            return new Response("Account suspended", { status: 403 });
          }
          const expired =
            profile.plan_expires_at &&
            new Date(profile.plan_expires_at).getTime() < Date.now();
          plan = expired ? "free" : ((profile.plan_type as PlanTier) ?? "free");

          const now = new Date();
          const reset = new Date(profile.messages_reset_at ?? now);
          const sameDay =
            reset.getUTCFullYear() === now.getUTCFullYear() &&
            reset.getUTCMonth() === now.getUTCMonth() &&
            reset.getUTCDate() === now.getUTCDate();
          messagesToday = sameDay ? profile.messages_today ?? 0 : 0;
          resetAt = sameDay ? profile.messages_reset_at : now.toISOString();

          if (plan === "free" && messagesToday >= FREE_DAILY_LIMIT) {
            return new Response(
              JSON.stringify({
                error: "daily_limit_reached",
                message: `Limite diário do plano Free atingido (${FREE_DAILY_LIMIT} mensagens). Faz upgrade para Pro ou ativa uma chave.`,
              }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }
        }

        // ── Resolve model with plan gating ──────────────────────────────
        const lastUser = [...(messages as UIMessage[])]
          .reverse()
          .find((m) => m.role === "user");
        const lastUserText =
          lastUser?.parts
            ?.map((p: { type: string; text?: string }) =>
              p.type === "text" ? p.text ?? "" : "",
            )
            .join(" ") ?? "";

        let chosenId: string;
        if (!model || model === "auto") {
          chosenId = autoRouteModel({ lastUserText, hasFiles, plan });
        } else if (!canUseModel(plan, model)) {
          // Locked → silently downgrade to a sensible default for the plan
          chosenId = autoRouteModel({ lastUserText, hasFiles, plan });
        } else {
          chosenId = model;
        }

        const gatewayId = resolveGatewayId(chosenId);
        const displayed = getModel(chosenId)?.label ?? chosenId;

        const baseSystem =
          systemPrompt?.trim() ||
          "You are J.A.R.V.I.S — a sharp, helpful AI assistant. Respond clearly using markdown when useful.";

        const skillsBlock =
          skills && skills.length
            ? `\n\n## Learned skills (apply when relevant)\n${skills
                .map((s, i) => `${i + 1}. ${s}`)
                .join("\n")}`
            : "";

        const trimmedContext =
          fileContext && fileContext.length > 0
            ? fileContext.length > MAX_FILE_CONTEXT
              ? fileContext.slice(0, MAX_FILE_CONTEXT) + "\n…[contexto de ficheiros truncado]"
              : fileContext
            : "";

        const filesBlock = trimmedContext
          ? `\n\n## Ficheiros anexados pelo utilizador (lê e usa este conteúdo real)\n${trimmedContext}\n\nQuando responderes sobre estes ficheiros, cita partes específicas e confirma quais leste.`
          : "";

        const fileGenBlock = `\n\n## Geração de ficheiros para download
Quando o utilizador pedir um ficheiro (PDF, DOCX, XLSX, CSV, JSON, TXT, código), responde SEMPRE com o conteúdo completo dentro de tags:

[GERAR_ARQUIVO:nome_do_ficheiro.ext]
<conteúdo completo aqui — sem comentários extra>
[/GERAR_ARQUIVO]

Regras:
- Usa a extensão correta no nome (.pdf, .docx, .xlsx, .csv, .json, .txt, .py, .js, .ts, .html, .css, .md, etc.).
- Para CSV/XLSX, escreve linhas separadas por vírgulas.
- Para código, coloca apenas o código dentro do bloco (sem markdown extra).
- Podes incluir várias tags [GERAR_ARQUIVO:...] na mesma resposta se forem pedidos vários ficheiros.
- NUNCA digas "não consigo gerar ficheiros" — gera sempre dentro das tags. O sistema cria o download automaticamente.
- Antes ou depois da tag, escreve uma frase curta a explicar o que está no ficheiro.`;

        const imageGenBlock = `\n\n## Geração de imagens
Quando o utilizador pedir uma imagem, foto, desenho, ilustração, logótipo, arte, capa, banner ou qualquer visual, responde SEMPRE com:

[GERAR_IMAGEM: descrição visual muito detalhada em inglês (estilo, composição, luz, cores, enquadramento)][/GERAR_IMAGEM]

Regras:
- A descrição dentro da tag tem de ser em inglês e muito detalhada.
- NUNCA digas "não consigo gerar imagens" — usa sempre a tag; o sistema gera a imagem automaticamente.
- Escreve uma frase curta em português antes da tag a descrever o que vais criar.
- Uma tag por imagem pedida.`;

        const routedNote = `\n\n[Routed: ${displayed} → ${gatewayId}]`;

        const modelMessages = (await convertToModelMessages(messages as UIMessage[])) as ModelMessage[];

        // Attach images + audios to the last user message as multimodal parts.
        const safeImages = (images ?? []).slice(0, MAX_IMAGES);
        const safeAudios = (audios ?? []).slice(0, 3);
        if (safeImages.length > 0 || safeAudios.length > 0) {
          for (let i = modelMessages.length - 1; i >= 0; i--) {
            const m = modelMessages[i];
            if (m.role !== "user") continue;
            const existing = Array.isArray(m.content)
              ? m.content
              : [{ type: "text" as const, text: String(m.content ?? "") }];
            const imageParts = safeImages.map((img) => ({
              type: "image" as const,
              image: `data:${img.mimeType};base64,${img.base64}`,
            }));
            const audioParts = safeAudios.map((a) => ({
              type: "file" as const,
              data: a.base64,
              mediaType: a.mimeType || "audio/mpeg",
            }));
            modelMessages[i] = {
              ...m,
              content: [...existing, ...imageParts, ...audioParts],
            } as ModelMessage;
            break;
          }
        }

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway(gatewayId),
          system: baseSystem + skillsBlock + filesBlock + fileGenBlock + imageGenBlock + FILE_CONFIRM_RULE + routedNote,
          messages: modelMessages,
          abortSignal: request.signal,
        });


        // ── Increment counter (fire-and-forget, service role) ───────────
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          void supabaseAdmin
            .from("profiles")
            .update({
              messages_today: messagesToday + 1,
              messages_reset_at: resetAt ?? new Date().toISOString(),
              last_active_at: new Date().toISOString(),
            })
            .eq("id", userId);
        } catch {
          /* noop */
        }

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onError: (err) => {
            const e = err as { statusCode?: number; message?: string; responseBody?: string };
            const body = `${e?.responseBody ?? ""} ${e?.message ?? ""}`.toLowerCase();
            if (e?.statusCode === 402 || body.includes("not enough credits") || body.includes("payment_required"))
              return "credits: Créditos de IA esgotados no workspace. Adiciona créditos para continuar.";
            if (e?.statusCode === 429) return "429: Demasiados pedidos. Aguarda uns segundos.";
            if (e?.statusCode === 403) return "403: Acesso ao modelo bloqueado.";
            return e?.message ? e.message.slice(0, 200) : "Erro na resposta do modelo.";
          },
          headers: {
            "X-Resolved-Model": gatewayId,
            "X-Displayed-Model": displayed,
            "X-User-Plan": plan,
          },
        });
      },
    },
  },
});
