import { createFileRoute } from "@tanstack/react-router";
import { createServerClient } from "@supabase/ssr";
import { rateLimit, sweep } from "@/lib/rate-limit.server";

const TTS_MODEL = "gpt-4o-mini-tts";
const MAX_TEXT = 3_000;
const INSTRUCTIONS =
  "Fala num tom calmo, preciso, ligeiramente formal e confiante, como um assistente pessoal britânico de elite — como o Jarvis do Homem de Ferro. Ritmo pausado, sem pressa, claro.";

type Body = { text?: string };

export const Route = createFileRoute("/api/create-speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabase = createServerClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            cookies: { getAll: () => [], setAll: () => {} },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );
        const { data: u, error } = await supabase.auth.getUser();
        if (error || !u.user) return new Response("Unauthorized", { status: 401 });

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_suspended")
          .eq("id", u.user.id)
          .maybeSingle();
        if (profile?.is_suspended) return new Response("Conta suspensa", { status: 403 });

        sweep();
        const rl = rateLimit(`speech:${u.user.id}`, 40, 60_000);
        if (!rl.ok) return Response.json({ error: "rate_limited" }, { status: 429 });

        const body = (await request.json()) as Body;
        const input = (body.text ?? "").slice(0, MAX_TEXT).trim();
        if (!input) return new Response("Texto vazio", { status: 400 });

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: TTS_MODEL,
              input,
              voice: "onyx",
              instructions: INSTRUCTIONS,
              response_format: "mp3",
            }),
          });

          if (!upstream.ok) {
            const errText = await upstream.text().catch(() => "");
            return Response.json(
              { error: errText || `Gateway ${upstream.status}` },
              { status: upstream.status },
            );
          }

          const buf = new Uint8Array(await upstream.arrayBuffer());
          let binary = "";
          const CHUNK = 0x8000;
          for (let i = 0; i < buf.length; i += CHUNK) {
            binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
          }
          const b64 = btoa(binary);
          if (!b64) return Response.json({ error: "Sem áudio devolvido." }, { status: 502 });

          return Response.json({ b64, mimeType: "audio/mpeg" });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
