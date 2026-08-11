import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { guardCreate } from "@/lib/create-guard.server";

const STT_MODEL = "openai/gpt-4o-mini-transcribe";
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

/** Tools that post-process the transcript with a chat model. */
const POST_PROCESS: Record<string, string> = {
  "meeting-notes":
    "A partir desta transcrição de reunião, escreve em markdown: Resumo (3 bullets), Decisões, Ações (responsável + prazo se mencionado) e Temas em aberto.",
  subtitles:
    "Converte esta transcrição em legendas no formato SRT, com blocos curtos de 1 a 2 linhas e tempos estimados sequenciais.",
};

export const Route = createFileRoute("/api/create-stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const toolId = form.get("toolId");
        const guard = await guardCreate(request, toolId, 12);
        if (!guard.ok) return guard.response;

        const file = form.get("file");
        if (!(file instanceof File)) {
          return new Response("Ficheiro de áudio obrigatório", { status: 400 });
        }
        if (file.size > MAX_AUDIO_BYTES) {
          return new Response("Áudio demasiado grande (máx. 20 MB)", { status: 413 });
        }

        try {
          const upstreamForm = new FormData();
          upstreamForm.set("model", STT_MODEL);
          upstreamForm.set("file", file, file.name || "audio.mp3");

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${guard.apiKey}` },
            body: upstreamForm,
          });

          if (!upstream.ok) {
            const errText = await upstream.text().catch(() => "");
            return Response.json(
              { error: errText || `Gateway ${upstream.status}` },
              { status: upstream.status },
            );
          }

          const json = (await upstream.json()) as { text?: string };
          let text = json.text?.trim() ?? "";
          if (!text) {
            return Response.json({ error: "Sem fala detetada no áudio." }, { status: 502 });
          }

          const post = POST_PROCESS[guard.tool.id];
          if (post) {
            const gateway = createLovableAiGatewayProvider(guard.apiKey);
            const result = streamText({
              model: gateway("google/gemini-3.6-flash"),
              system: "Responde em português de Portugal, em markdown limpo, sem preâmbulos.",
              prompt: `${post}\n\nTranscrição:\n${text.slice(0, 40_000)}`,
            });
            text = await result.text;
          }

          return Response.json({ text });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
