import { createFileRoute } from "@tanstack/react-router";
import { buildInstruction, guardCreate } from "@/lib/create-guard.server";

const IMAGE_MODEL = "google/gemini-3.1-flash-image";
const MAX_PROMPT = 4_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type Body = {
  toolId?: string;
  prompt?: string;
  fields?: Record<string, string>;
  image?: { mimeType: string; base64: string };
};

const ASPECT_HINT: Record<string, string> = {
  Quadrado: "Formato quadrado 1:1.",
  Horizontal: "Formato horizontal 16:9.",
  Vertical: "Formato vertical 9:16.",
};

export const Route = createFileRoute("/api/create-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const guard = await guardCreate(request, body.toolId, 12);
        if (!guard.ok) return guard.response;

        const tool = guard.tool;
        const prompt = (body.prompt ?? "").slice(0, MAX_PROMPT).trim();

        if (tool.engine === "image-edit" && !body.image) {
          return new Response("Esta ferramenta precisa de uma imagem", { status: 400 });
        }
        if (tool.engine === "image" && !prompt) {
          return new Response("Prompt vazio", { status: 400 });
        }
        if (body.image && body.image.base64.length * 0.75 > MAX_IMAGE_BYTES) {
          return new Response("Imagem demasiado grande (máx. 8 MB)", { status: 413 });
        }

        const aspect = body.fields?.aspect ? ASPECT_HINT[body.fields.aspect] ?? "" : "";
        const instruction = `${buildInstruction(tool, body.fields)} ${aspect}`.trim();
        const text = prompt
          ? `${instruction}\n\nPedido: ${prompt}`
          : instruction;

        const content: Array<Record<string, unknown>> = [{ type: "text", text }];
        if (body.image) {
          content.push({
            type: "image_url",
            image_url: { url: `data:${body.image.mimeType};base64,${body.image.base64}` },
          });
        }

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${guard.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: IMAGE_MODEL,
              messages: [{ role: "user", content }],
              modalities: ["image", "text"],
            }),
          });

          if (!upstream.ok) {
            const errText = await upstream.text().catch(() => "");
            return Response.json(
              { error: errText || `Gateway ${upstream.status}` },
              { status: upstream.status },
            );
          }

          const json = (await upstream.json()) as {
            data?: Array<{ b64_json?: string }>;
          };
          const b64 = json.data?.[0]?.b64_json;
          if (!b64) {
            return Response.json({ error: "O modelo não devolveu imagem." }, { status: 502 });
          }
          return Response.json({ b64 });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
