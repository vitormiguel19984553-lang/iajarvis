import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";

type LearnBody = { userMessage?: string; assistantMessage?: string };

export const Route = createFileRoute("/api/learn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { userMessage, assistantMessage } = (await request.json()) as LearnBody;
        if (!userMessage || !assistantMessage) {
          return Response.json({ skill: null });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ skill: null });

        const gateway = createLovableAiGatewayProvider(key);
        try {
          const { text } = await generateText({
            model: gateway("google/gemini-2.5-flash-lite"),
            system:
              "You distill durable, reusable skills from a successful AI exchange. Output ONE short imperative sentence (max 20 words) capturing a generalizable lesson, technique, or user preference the assistant should remember for future tasks. Output ONLY the sentence — no quotes, no prefix. If nothing useful, output exactly: NONE",
            prompt: `User asked:\n${userMessage.slice(0, 1500)}\n\nAssistant answered:\n${assistantMessage.slice(0, 2000)}\n\nDistill ONE reusable skill or preference:`,
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
