import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import {
  LOVABLE_AI_GATEWAY_URL,
  LOVABLE_AI_MODEL,
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

type ChatRequestBody = {
  messages?: unknown;
};

const chatSystemPrompt = `You are Aurora Workplace AI, an assistant for workplace productivity.
Help professionals draft emails, summarize meeting notes, plan work, and shape research briefs.
Use markdown for clear headings and lists. Be specific, concise, and ask clarifying questions when key details are missing.
Treat every output as a draft that the user should review, edit, and verify before use.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response("Lovable AI is not configured for this project.", {
            status: 500,
          });
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
        const lovable = createOpenAI({
          baseURL: LOVABLE_AI_GATEWAY_URL,
          apiKey: key,
          headers: {
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: lovable.responses(LOVABLE_AI_MODEL),
          system: chatSystemPrompt,
          messages: await convertToModelMessages(body.messages as UIMessage[]),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
            sendReasoning: true,
            headers: getLovableAiGatewayResponseHeaders(initialRunId),
          }),
          runIdFetch,
        );
      },
    },
  },
});