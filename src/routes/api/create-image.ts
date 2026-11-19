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

        const FREE_MODELS: Record<string, string> = {
          "Grátis — Flux": "flux",
          "Grátis — GPT Image": "gptimage",
          "Grátis — Sana": "sana",
        };
        const forcedFree = FREE_MODELS[body.fields?.motor ?? ""];
        const freeImage = async (model: string) => {
          const size = body.fields?.aspect === "Horizontal" ? "width=1344&height=768"
            : body.fields?.aspect === "Vertical" ? "width=768&height=1344" : "width=1024&height=1024";
          const seed = Math.floor(Math.random() * 1e9);
          const free = await fetch(
            `https://image.pollinations.ai/prompt/${encodeURIComponent(text.slice(0, 1500))}?${size}&nologo=true&model=${model}&seed=${seed}`,
          );
          if (!free.ok) return null;
          const bytes = new Uint8Array(await free.arrayBuffer());
          let bin = "";
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          return Response.json({ b64: btoa(bin), provider: `pollinations:${model}` });
        };
        if (forcedFree && !body.image) {
          const r = await freeImage(forcedFree);
          if (r) return r;
          return Response.json({ error: "Gerador grátis indisponível, tenta outro motor." }, { status: 502 });
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
              stream: true,
            }),
            signal: request.signal,
          });

          if (!upstream.ok && (upstream.status === 402 || upstream.status === 403) && prompt) {
            const r = await freeImage("flux");
            if (r) return r;
          }
          if (!upstream.ok) {
            const errText = await upstream.text().catch(() => "");
            return Response.json(
              { error: errText || `Gateway ${upstream.status}` },
              { status: upstream.status },
            );
          }

          if (!upstream.body) {
            return Response.json({ error: "O modelo não devolveu imagem." }, { status: 502 });
          }
          return new Response(upstream.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
            },
          });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
