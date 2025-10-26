import { getAI } from "../client";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "genkit";
import type { MessageContext } from "../../types";

/**
 * Extract calendar events from a message with conversation context
 */
export async function extractCalendarEvents(
  previousMessages: MessageContext[],
  currentMessage: MessageContext,
  messageId: string,
  participantUserIds: string[] = [],
  chatId?: string
): Promise<
  Array<{
    id: string;
    title: string;
    description?: string;
    date: number;
    time?: string;
    participants?: string[];
    extractedFrom: string;
    chatId?: string;
  }>
> {
  const aiClient = getAI();
  if (!aiClient) {
    return [];
  }

  const EventSchema = z.object({
    events: z.array(
      z.object({
        title: z.string().describe("Meeting/event title"),
        description: z
          .string()
          .optional()
          .describe("Brief description of the event or what will be discussed"),
        date: z.string().describe("Date in ISO format YYYY-MM-DD"),
        time: z
          .string()
          .optional()
          .describe("Time if specified (HH:MM format)"),
        participants: z
          .array(z.string())
          .optional()
          .describe("Mentioned participants by name"),
      })
    ),
  });

  // Build context about who's in the conversation
  const participantContext =
    participantUserIds.length > 0
      ? `\n\nConversation participants (user IDs): ${participantUserIds.join(", ")}. Include all participants unless specifically mentioned otherwise.`
      : "";

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

  const prompt = `You are extracting calendar events from a work message.
Identify any:
- Meeting invitations
- Scheduled events
- Deadlines with dates
- Time-based commitments
- Events that may span multiple messages (e.g., date mentioned in one message, time in another)

${conversationContext}
${currentMsgContext}
${participantContext}

Extract events with:
- A clear title
- A brief description (what will be discussed or the purpose of the event)
- Date and time if mentioned
- Participant names (use actual names from the conversation, not user IDs)

Include all conversation participants in the event unless the message specifies otherwise. If no specific events are mentioned, return an empty array.`;

  try {
    const result = await aiClient.generate({
      model: googleAI.model("gemini-2.5-flash-lite"),
      prompt,
      output: { schema: EventSchema },
    });

    const events = result.output?.events || [];
    return events.map(
      (
        event: {
          title: string;
          description?: string;
          date: string;
          time?: string;
          participants?: string[];
        },
        index: number
      ) => {
        const date = new Date(event.date).getTime();
        return {
          id: `event-${messageId}-${index}`,
          title: event.title,
          description: event.description,
          date: isNaN(date) ? Date.now() : date,
          time: event.time,
          // Participants will be actual names from the conversation, not user IDs
          participants:
            event.participants && event.participants.length > 0
              ? event.participants
              : participantUserIds,
          extractedFrom: messageId,
          chatId,
        };
      }
    );
  } catch (error) {
    console.error("Calendar extraction error:", error);
    return [];
  }
}
