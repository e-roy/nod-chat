import { getAI } from "../client";
import { googleAI } from "@genkit-ai/googleai";
import { formatMessageDate, getCurrentDateContext } from "../utils";

/**
 * Generate AI summary for messages
 */
export async function generateSummary(
  messages: Array<{ senderId: string; text: string; createdAt: number }>
): Promise<string> {
  const aiClient = getAI();
  if (!aiClient) {
    throw new Error("AI not available");
  }

  const currentDateTime = getCurrentDateContext();
  const messagesText = messages
    .map((m) => `[${formatMessageDate(m.createdAt)}] ${m.text}`)
    .join("\n");

  const prompt = `You are analyzing a work chat conversation for a remote team.
Generate a comprehensive concise summary (1-2 paragraphs) that captures:
- Main topics and discussions throughout the conversation
- Recent developments and current focus (emphasize messages near the end)
- Key decisions and agreements reached
- Important action items and commitments

The conversation is ordered chronologically. Pay special attention to the most recent messages as they reflect the current state of discussions.

Current date/time for context: ${currentDateTime}

CRITICAL INSTRUCTIONS for handling dates and times in your summary:
1. When a message contains relative terms like "tomorrow", "today", "next week", etc., you MUST resolve these to actual dates based on the message timestamp
2. Example: If a message dated "Mar 15, 3:45 PM" says "let's meet tomorrow at 3pm", the summary should say "Let's meet on March 16 at 3pm", NOT "Let's meet tomorrow at 3pm"
3. When referencing action items, deadlines, or commitments, use the actual resolved dates
4. For non-date-specific content, write in a concise, professional style without unnecessary timestamps
5. DO NOT use relative terms like "today" or "tomorrow" in your summary - always use specific dates when discussing time-sensitive information

Conversation:
${messagesText}

Summary (resolve all relative time references to actual dates):`;

  const result = await aiClient.generate({
    model: googleAI.model("gemini-2.5-flash-lite"),
    prompt,
  });

  return result.text?.trim() || "No summary available";
}
