import { getAI } from "../client";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "genkit";
import { formatMessageDate, getCurrentDateContext } from "../utils";

/**
 * Extract decisions from messages
 */
export async function extractDecisions(
  messages: Array<{ senderId: string; text: string; createdAt: number }>,
  subject?: string
): Promise<
  Array<{ id: string; subject: string; decision: string; timestamp: number }>
> {
  const aiClient = getAI();
  if (!aiClient) {
    throw new Error("AI not available");
  }

  const currentDateTime = getCurrentDateContext();
  const messagesText = messages
    .map((m) => `[${formatMessageDate(m.createdAt)}] ${m.text}`)
    .join("\n");

  const DecisionSchema = z.object({
    decisions: z.array(
      z.object({
        subject: z.string().describe("Topic or area of the decision"),
        decision: z.string().describe("The decision made"),
        messageIndex: z
          .number()
          .optional()
          .describe(
            "Index of the message in the conversation where the decision was made (0-based)"
          ),
      })
    ),
  });

  const subjectFilter = subject
    ? `Focus on decisions related to: ${subject}`
    : "";

  const prompt = `You are analyzing a work chat for a remote team.
Extract all decisions, agreements, and conclusions reached.

Current date/time for context: ${currentDateTime}

${subjectFilter}

CRITICAL INSTRUCTIONS:
1. For each decision, identify which message in the conversation contains the final agreement or conclusion
2. The conversation messages are numbered starting from 0
3. Return the messageIndex of the message where the decision was made (the last message where agreement was reached)
4. Focus on messages that show explicit agreement like "sounds good", "agreed", "let's do that", or concrete commitments

Conversation (numbered messages):
${messagesText
  .split("\n")
  .map((line, idx) => `[${idx}] ${line}`)
  .join("\n")}

Identify clear decisions made by the team. Group by subject/topic. For each decision, return the messageIndex (0-based) of the message where the final agreement was reached.`;

  const result = await aiClient.generate({
    model: googleAI.model("gemini-2.5-flash-lite"),
    prompt,
    output: { schema: DecisionSchema },
  });

  const decisions = result.output?.decisions || [];
  const extractionTime = Date.now();

  // Parse message timestamps from AI response
  return decisions.map((item: any, index: number) => {
    // Get timestamp from the message that contains the decision
    let timestamp = extractionTime; // Default to extraction time
    const messageIndex = item.messageIndex;

    // If AI provided a messageIndex, use the timestamp from that message
    if (
      typeof messageIndex === "number" &&
      messageIndex >= 0 &&
      messageIndex < messages.length
    ) {
      const message = messages[messageIndex];
      timestamp = message.createdAt;
      console.log(
        `Decision ${index}: Using timestamp from message ${messageIndex}:`,
        new Date(timestamp).toISOString()
      );
    } else {
      console.warn(
        `Decision ${index}: No valid messageIndex provided (${messageIndex}), using extraction time`
      );
    }

    // Use a combination of timestamp and index to create unique IDs
    // This prevents collisions when multiple decisions are extracted at the same time
    const idSuffix =
      timestamp.toString().slice(-8) + index.toString().padStart(3, "0");

    console.log("Final decision:", {
      id: `decision-${idSuffix}`,
      subject: item.subject,
      timestamp: timestamp,
      timestampDate: new Date(timestamp).toISOString(),
      messageIndex: messageIndex,
    });

    return {
      id: `decision-${idSuffix}`,
      subject: item.subject,
      decision: item.decision,
      timestamp: timestamp,
    };
  });
}
