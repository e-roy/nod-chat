import { getAI } from "../client";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "genkit";
import * as logger from "firebase-functions/logger";
import type { EnrichedContext, ActionPlan } from "./types";

const ActionPlanSchema = z.object({
  actions: z
    .array(z.string())
    .describe("List of actions to execute (e.g., 'priority', 'calendar')"),
  priority: z
    .enum(["high", "medium", "low"])
    .optional()
    .describe("Overall priority of the message"),
  reasoning: z
    .string()
    .optional()
    .describe("Brief reasoning for the action selection"),
});

/**
 * Analyze message and context to determine which actions to run
 * Uses Gemini Flash Lite for fast, cost-effective routing decisions
 */
export async function analyzeMessageAndRoute(
  context: EnrichedContext
): Promise<ActionPlan> {
  const ai = getAI();
  if (!ai) {
    logger.warn("AI not available, cannot analyze message");
    throw new Error("AI not available");
  }

  try {
    // Build conversation context
    let conversationContext = "";
    if (context.previousMessages.length > 0) {
      conversationContext = "Previous conversation context:\n";
      context.previousMessages.forEach((msg, index) => {
        const date = new Date(msg.createdAt).toISOString();
        conversationContext += `${index + 1}. ${msg.senderName} (${date}): ${msg.text}\n`;
      });
      conversationContext += "\n";
    }

    const currentDate = new Date(
      context.currentMessage.createdAt
    ).toISOString();
    const currentMsgText = context.currentMessage.text || "";
    const currentSenderName = context.currentMessage.senderName;

    const prompt = `You are an intelligent message routing agent for a work messaging app.

Analyze the following message and conversation context to determine which actions should be executed.

AVAILABLE ACTIONS:
1. "priority" - Detect if this is an urgent or high-priority message that needs immediate attention
   - Urgent requests, blockers, critical issues
   - Time-sensitive matters, deadlines
   - Escalation in conversation urgency

2. "calendar" - Extract calendar events and scheduled meetings
   - Meeting invitations
   - Scheduled events with dates/times
   - Deadlines with specific dates
   - Time-based commitments

${conversationContext}Current message:\n${currentSenderName} (${currentDate}): ${currentMsgText}

INSTRUCTIONS:
- Analyze the message and conversation flow
- Determine which actions are relevant (can select multiple or none)
- Assess overall priority level of the message
- Return a structured plan with the actions to execute

For example:
- A message saying "URGENT: Production bug, need help ASAP" → actions: ["priority"], priority: "high"
- A message saying "Let's meet tomorrow at 3pm" → actions: ["calendar"]
- A message saying "Thanks!" → actions: [] (no actions needed)`;

    logger.info("Calling AI agent for routing decision", {
      messageId: context.currentMessage.messageId,
      hasContext: context.previousMessages.length > 0,
    });

    const result = await ai.generate({
      model: googleAI.model("gemini-2.5-flash-lite"),
      prompt,
      output: { schema: ActionPlanSchema },
    });

    const actionPlan: ActionPlan = result.output || {
      actions: [],
      priority: "low",
    };

    logger.info("AI agent routing decision", {
      messageId: context.currentMessage.messageId,
      actions: actionPlan.actions,
      priority: actionPlan.priority,
      reasoning: actionPlan.reasoning,
    });

    return actionPlan;
  } catch (error) {
    logger.error("Error in AI agent routing decision:", error);
    // Return empty action plan on error
    return {
      actions: [],
      priority: "low",
      reasoning: "AI routing failed",
    };
  }
}

/**
 * Analyze message to determine optimal context depth
 * This can be used to fetch only the necessary amount of history
 */
export async function determineContextDepth(
  context: EnrichedContext
): Promise<number> {
  const ai = getAI();
  if (!ai) {
    // Default to 5 messages if AI unavailable
    return 5;
  }

  try {
    const currentMsgText = context.currentMessage.text || "";

    const DepthSchema = z.object({
      depth: z
        .number()
        .min(0)
        .max(10)
        .describe("Number of previous messages needed for context"),
      reason: z.string().describe("Brief reason for the depth requirement"),
    });

    const prompt = `Determine how many previous messages are needed to understand the current message in context.

Current message: ${currentMsgText}

Return a depth value between 0-10:
- 0: Message is self-contained (e.g., standalone greeting, acknowledgment)
- 1-2: Needs minimal context (e.g., simple questions)
- 3-5: Needs moderate context (e.g., ongoing discussion, meeting scheduling)
- 6-10: Needs extensive context (e.g., complex multi-turn conversation, changing topics)`;

    const result = await ai.generate({
      model: googleAI.model("gemini-2.5-flash-lite"),
      prompt,
      output: { schema: DepthSchema },
    });

    const depth = result.output?.depth ?? 5;

    logger.info("AI determined context depth", {
      messageId: context.currentMessage.messageId,
      depth,
      reason: result.output?.reason,
    });

    return depth;
  } catch (error) {
    logger.error("Error determining context depth:", error);
    // Default to 5 on error
    return 5;
  }
}
