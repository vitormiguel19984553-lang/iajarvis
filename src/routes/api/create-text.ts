import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { buildInstruction, guardCreate } from "@/lib/create-guard.server";

const MAX_PROMPT = 20_000;

type Body = {
  toolId?: string;
  prompt?: string;
  fields?: Record<string, string>;
};

export const Route = createFileRoute("/api/create-text")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const guard = await guardCreate(request, body.toolId, 20);
        if (!guard.ok) return guard.response;

        const prompt = (body.prompt ?? "").slice(0, MAX_PROMPT).trim();
        if (!prompt) return new Response("Prompt vazio", { status: 400 });

        const gateway = createLovableAiGatewayProvider(guard.apiKey);

        try {
          const result = streamText({
            model: gateway("google/gemini-3.6-flash"),
            system: `És o J.A.R.V.I.S., um assistente criativo de elite. Tarefa: "${guard.tool.label}".
${buildInstruction(guard.tool, body.fields)}
Responde em português de Portugal (salvo indicação de idioma diferente), em markdown limpo e pronto a usar. Sem preâmbulos nem desculpas.`,
            prompt,
          });
          const text = await result.text;
          return Response.json({ text });
        } catch (e) {
          const msg = (e as Error).message ?? "Erro";
          const status = /402|credit/i.test(msg) ? 402 : /429|rate/i.test(msg) ? 429 : 500;
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
