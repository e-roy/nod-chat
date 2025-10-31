import { getFirestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { getAI } from "../client";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "genkit";
import type { EnrichedContext, ActionResult } from "../orchestrator/types";
import type { MessageContext } from "../orchestrator/types";

const db = getFirestore();

const PrioritySchema = z.object({
  isPriority: z
    .boolean()
    .describe("Whether this message contains priority information"),
  level: z.enum(["high", "urgent"]).optional().describe("Priority level"),
  reason: z.string().optional().describe("Brief reason for priority"),
});

/**
 * Priority detection action handler
 * Detects urgent/high-priority messages and updates Firestore collections
 */
export async function handlePriorityAction(
  context: EnrichedContext,
  metadata?: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const { currentMessage, chatMetadata } = context;

    // Skip if no text content
    if (!currentMessage.text || currentMessage.text.trim() === "") {
      return {
        actionName: "priority",
        success: true,
        data: { skipped: "no text content" },
      };
    }

    // Detect priority using AI
    const priorityResult = await detectPriority(
      context.previousMessages,
      currentMessage
    );

    if (!priorityResult.isPriority || !priorityResult.level) {
      logger.info("No priority detected", {
        messageId: currentMessage.messageId,
      });
      return {
        actionName: "priority",
        success: true,
        data: { isPriority: false },
      };
    }

    const priority = {
      messageId: currentMessage.messageId,
      level: priorityResult.level,
      reason: priorityResult.reason || "Priority detected",
      timestamp: currentMessage.createdAt,
    };

    // Update chat priorities
    await db
      .collection("chatPriorities")
      .doc(chatMetadata.chatId)
      .set(
        {
          chatId: chatMetadata.chatId,
          priorities: FieldValue.arrayUnion(priority),
          lastUpdated: Date.now(),
        },
        { merge: true }
      );

    // Update user priorities for all participants
    const priorityWithChat = { ...priority, chatId: chatMetadata.chatId };
    const updatePromises = context.participants.map(async (participant) => {
      const userPrioritiesRef = db
        .collection("userPriorities")
        .doc(participant.userId);
      await userPrioritiesRef.set(
        {
          userId: participant.userId,
          priorities: FieldValue.arrayUnion(priorityWithChat),
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    });

    await Promise.all(updatePromises);

    logger.info("Priority detected and stored", {
      messageId: currentMessage.messageId,
      level: priorityResult.level,
    });

    return {
      actionName: "priority",
      success: true,
      data: {
        priority: priorityResult.level,
        reason: priorityResult.reason,
      },
    };
  } catch (error) {
    logger.error("Error in priority action:", error);
    return {
      actionName: "priority",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Detect priority level in a message with conversation context
 */
async function detectPriority(
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
    logger.error("Priority detection error:", error);
    return { isPriority: false };
  }
}
