import { createOpenAI } from "@ai-sdk/openai";
import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { z } from "zod";

import {
  LOVABLE_AI_GATEWAY_URL,
  LOVABLE_AI_MODEL,
  createLovableAiGatewayRunIdFetch,
} from "./ai-gateway.server";

const workplaceToolInput = z.object({
  toolId: z.enum(["email", "notes", "tasks", "research"]),
  brief: z.string().trim().min(1),
  audience: z.string().trim().optional(),
  tone: z.string().trim().optional(),
  source: z.string().trim().optional(),
  goal: z.string().trim().optional(),
});

const systemPrompt = `You are Aurora Workplace AI, a professional productivity assistant for knowledge workers.
Create polished, editable drafts that are specific to the supplied business context.
Never pretend to have verified external facts. Mark assumptions clearly and ask for missing information when it affects accuracy.
Keep outputs practical, structured, concise, and ready for a human to review before sending or acting.`;

function toolPrompt(data: z.infer<typeof workplaceToolInput>) {
  const contextLines = [
    `Primary brief: ${data.brief}`,
    data.audience ? `Audience: ${data.audience}` : undefined,
    data.tone ? `Tone: ${data.tone}` : undefined,
    data.goal ? `Goal: ${data.goal}` : undefined,
    data.source ? `Source material: ${data.source}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const instructions = {
    email:
      "Write a work email with a subject line, greeting, concise body, clear next step, and professional close.",
    notes:
      "Summarize meeting notes into overview, key decisions, action items with owners if known, open questions, and risks.",
    tasks:
      "Turn the work request into a prioritized task plan with milestones, checklist items, dependencies, and a first next action.",
    research:
      "Create a research brief with what is known, assumptions, suggested search angles, evaluation criteria, and questions to verify.",
  } satisfies Record<z.infer<typeof workplaceToolInput>["toolId"], string>;

  return `${instructions[data.toolId]}\n\nUse this structured input:\n${contextLines}`;
}

export const generateWorkplaceDraft = createServerFn({ method: "POST" })
  .validator(workplaceToolInput)
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) {
      throw new Error("Lovable AI is not configured for this project.");
    }

    const runIdFetch = createLovableAiGatewayRunIdFetch();
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
      system: systemPrompt,
      prompt: toolPrompt(data),
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

    return { text: await result.text };
  });