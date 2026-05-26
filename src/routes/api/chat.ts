import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { autoRouteModel, type ModelId } from "@/lib/models";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type ChatRequestBody = {
  messages?: unknown;
  systemPrompt?: string;
  model?: ModelId | "auto";
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

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        // Resolve model — auto-route if requested.
        const lastUser = [...(messages as UIMessage[])]
          .reverse()
          .find((m) => m.role === "user");
        const lastUserText =
          lastUser?.parts
            ?.map((p: { type: string; text?: string }) =>
              p.type === "text" ? p.text ?? "" : "",
            )
            .join(" ") ?? "";

        const resolvedModel: ModelId =
          !model || model === "auto"
            ? autoRouteModel({
                lastUserText,
                hasFiles,
                totalMessages: messages.length,
              })
            : model;

        const baseSystem =
          systemPrompt?.trim() ||
          "You are J.A.R.V.I.S — a sharp, helpful AI assistant. Respond clearly using markdown when useful.";

        const skillsBlock =
          skills && skills.length
            ? `\n\n## Learned skills (apply when relevant)\n${skills
                .map((s, i) => `${i + 1}. ${s}`)
                .join("\n")}`
            : "";

        const routedNote = `\n\n[Auto-routed model: ${resolvedModel}]`;

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway(resolvedModel),
          system: baseSystem + skillsBlock + routedNote,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          headers: { "X-Resolved-Model": resolvedModel },
        });
      },
    },
  },
});
