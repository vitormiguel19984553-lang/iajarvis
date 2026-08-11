import { createFileRoute } from "@tanstack/react-router";
import { buildInstruction, guardCreate } from "@/lib/create-guard.server";

const TTS_MODEL = "openai/gpt-4o-mini-tts";
const MAX_TEXT = 3_500;

type Body = {
  toolId?: string;
  prompt?: string;
  fields?: Record<string, string>;
};

export const Route = createFileRoute("/api/create-tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const guard = await guardCreate(request, body.toolId, 12);
        if (!guard.ok) return guard.response;

        const input = (body.prompt ?? "").slice(0, MAX_TEXT).trim();
        if (!input) return new Response("Texto vazio", { status: 400 });

        const voice = body.fields?.voice || "alloy";

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${guard.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: TTS_MODEL,
              input,
              voice,
              instructions: buildInstruction(guard.tool, body.fields),
              response_format: "mp3",
            }),
          });

          if (!upstream.ok || !upstream.body) {
            const errText = await upstream.text().catch(() => "");
            return Response.json(
              { error: errText || `Gateway ${upstream.status}` },
              { status: upstream.status },
            );
          }

          return new Response(upstream.body, {
            headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
          });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
