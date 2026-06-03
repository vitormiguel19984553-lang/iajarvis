import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { createServerClient } from "@supabase/ssr";
import { generateText } from "ai";
import { rateLimit, sweep } from "@/lib/rate-limit.server";

type LearnBody = { userMessage?: string; assistantMessage?: string };

export const Route = createFileRoute("/api/learn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require authentication
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");
        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }
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

        sweep();
        const rl = rateLimit(`learn:${u.user.id}`, 30, 60_000);
        if (!rl.ok) {
          return Response.json({ skill: null }, { status: 429 });
        }

        const { userMessage, assistantMessage } = (await request.json()) as LearnBody;
        if (
          !userMessage ||
          !assistantMessage ||
          typeof userMessage !== "string" ||
          typeof assistantMessage !== "string"
        ) {
          return Response.json({ skill: null });
        }
        // Cap input sizes to limit abuse
        const userMsg = userMessage.slice(0, 4000);
        const assistantMsg = assistantMessage.slice(0, 6000);

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ skill: null });

        const gateway = createLovableAiGatewayProvider(key);
        try {
          const { text } = await generateText({
            model: gateway("google/gemini-2.5-flash-lite"),
            system:
              "You distill durable, reusable skills from a successful AI exchange. Output ONE short imperative sentence (max 20 words) capturing a generalizable lesson, technique, or user preference the assistant should remember for future tasks. Output ONLY the sentence — no quotes, no prefix. If nothing useful, output exactly: NONE",
            prompt: `User asked:\n${userMsg.slice(0, 1500)}\n\nAssistant answered:\n${assistantMsg.slice(0, 2000)}\n\nDistill ONE reusable skill or preference:`,
          });
          const cleaned = text.trim().replace(/^["'\s]+|["'\s]+$/g, "");
          if (!cleaned || /^none$/i.test(cleaned)) {
            return Response.json({ skill: null });
          }
          return Response.json({ skill: cleaned });
        } catch {
          return Response.json({ skill: null });
        }
      },
    },
  },
});
