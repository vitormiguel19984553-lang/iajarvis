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
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { rateLimit, sweep } from "@/lib/rate-limit.server";

const MAX_MESSAGES = 80;
const MAX_TEXT_PER_MSG = 16_000;

type ChatRequestBody = {
  messages?: unknown;
  systemPrompt?: string;
  model?: string;
  skills?: string[];
  hasFiles?: boolean;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const { messages, systemPrompt, model, skills, hasFiles } = body;

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

        const routedNote = `\n\n[Routed: ${displayed} → ${gatewayId}]`;

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway(gatewayId),
          system: baseSystem + skillsBlock + routedNote,
          messages: await convertToModelMessages(messages as UIMessage[]),
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
