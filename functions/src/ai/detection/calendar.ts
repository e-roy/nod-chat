import { getAI } from "../client";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "genkit";

/**
 * Extract calendar events from a message
 */
export async function extractCalendarEvents(
  messageText: string,
  messageId: string,
  participantUserIds: string[] = [],
  chatId?: string
): Promise<
  Array<{
    id: string;
    title: string;
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

  const prompt = `You are extracting calendar events from a work message.
Identify any:
- Meeting invitations
- Scheduled events
- Deadlines with dates
- Time-based commitments

Message: "${messageText}"
${participantContext}

Extract events with dates and times. Include all conversation participants in the event unless the message specifies otherwise. If no specific events are mentioned, return an empty array.`;

  try {
    const result = await aiClient.generate({
      model: googleAI.model("gemini-2.5-flash-lite"),
      prompt,
      output: { schema: EventSchema },
    });

    const events = result.output?.events || [];
    return events.map((event: any, index: number) => {
      const date = new Date(event.date).getTime();
      return {
        id: `event-${messageId}-${index}`,
        title: event.title,
        date: isNaN(date) ? Date.now() : date,
        time: event.time,
        // Default to all conversation participants if not explicitly mentioned
        participants:
          event.participants && event.participants.length > 0
            ? event.participants
            : participantUserIds,
        extractedFrom: messageId,
        chatId,
      };
    });
  } catch (error) {
    console.error("Calendar extraction error:", error);
    return [];
  }
}
