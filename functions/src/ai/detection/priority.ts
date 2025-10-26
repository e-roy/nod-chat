import { getAI } from "../client";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "genkit";
import type { MessageContext } from "../../types";

/**
 * Detect priority level in a message with conversation context
 */
export async function detectPriority(
  previousMessages: MessageContext[],
  currentMessage: MessageContext
): Promise<{
  isPriority: boolean;
  level?: "high" | "urgent";
  reason?: string;
}> {
  const aiClient = getAI();
  if (!aiClient) {
    return { isPriority: false };
  }

  const PrioritySchema = z.object({
    isPriority: z
      .boolean()
      .describe("Whether this message contains priority information"),
    level: z.enum(["high", "urgent"]).optional().describe("Priority level"),
    reason: z.string().optional().describe("Brief reason for priority"),
  });

  // Build conversation context
  let conversationContext = "";
  if (previousMessages.length > 0) {
    conversationContext = "Previous conversation context:\n";
    previousMessages.forEach((msg, index) => {
      const date = new Date(msg.createdAt).toISOString();
      conversationContext += `${index + 1}. ${msg.senderName} (${date}): ${msg.text}\n`;
    });
  }

  const date = new Date(currentMessage.createdAt).toISOString();
  const currentMsgContext = `Current message:\n${currentMessage.senderName} (${date}): ${currentMessage.text}`;

  const prompt = `You are analyzing a work message for priority/urgency.
Detect if this message contains:
- Urgent requests or blockers
- Critical bugs or issues
- Deadlines or time-sensitive matters
- "ASAP", "urgent", "critical", "blocker" keywords
- Questions needing immediate attention
- Escalation in conversation urgency

${conversationContext}
${currentMsgContext}

Consider the conversation flow when determining priority. Determine if this is a priority message and classify its level.`;

  try {
    const result = await aiClient.generate({
      model: googleAI.model("gemini-2.5-flash-lite"),
      prompt,
      output: { schema: PrioritySchema },
    });

    return result.output || { isPriority: false };
  } catch (error) {
    console.error("Priority detection error:", error);
    return { isPriority: false };
  }
}
