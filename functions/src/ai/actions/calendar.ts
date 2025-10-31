import { getFirestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { getAI } from "../client";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "genkit";
import type { EnrichedContext, ActionResult } from "../orchestrator/types";
import type { MessageContext } from "../orchestrator/types";

const db = getFirestore();

const EventSchema = z.object({
  events: z.array(
    z.object({
      title: z.string().describe("Meeting/event title"),
      description: z
        .string()
        .optional()
        .describe("Brief description of the event or what will be discussed"),
      date: z.string().describe("Date in ISO format YYYY-MM-DD"),
      time: z.string().optional().describe("Time if specified (HH:MM format)"),
      participants: z
        .array(z.string())
        .optional()
        .describe("Mentioned participants by name"),
    })
  ),
});

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: number;
  time?: string;
  participants?: string[];
  extractedFrom: string;
  chatId?: string;
}

/**
 * Calendar extraction action handler
 * Extracts calendar events from messages and updates Firestore collections
 */
export async function handleCalendarAction(
  context: EnrichedContext,
  metadata?: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const { currentMessage, chatMetadata } = context;

    // Skip if no text content
    if (!currentMessage.text || currentMessage.text.trim() === "") {
      return {
        actionName: "calendar",
        success: true,
        data: { skipped: "no text content" },
      };
    }

    // Extract participant names for better event storage
    const participantNames = context.participants.map((p) => p.name);

    // Extract calendar events
    const events = await extractCalendarEvents(
      context.previousMessages,
      currentMessage,
      currentMessage.messageId,
      participantNames,
      chatMetadata.chatId
    );

    if (events.length === 0) {
      logger.info("No calendar events found", {
        messageId: currentMessage.messageId,
      });
      return {
        actionName: "calendar",
        success: true,
        data: { events: [] },
      };
    }

    // Update chat calendar
    await db
      .collection("chatCalendar")
      .doc(chatMetadata.chatId)
      .set(
        {
          chatId: chatMetadata.chatId,
          events: FieldValue.arrayUnion(...events),
          lastUpdated: Date.now(),
        },
        { merge: true }
      );

    // Update user calendar for all participants
    const eventsWithChat = events.map((event) => ({
      ...event,
      chatId: chatMetadata.chatId,
    }));
    const updatePromises = context.participants.map(async (participant) => {
      const userCalendarRef = db
        .collection("userCalendar")
        .doc(participant.userId);
      await userCalendarRef.set(
        {
          userId: participant.userId,
          events: FieldValue.arrayUnion(...eventsWithChat),
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    });

    await Promise.all(updatePromises);

    logger.info("Calendar events extracted and stored", {
      messageId: currentMessage.messageId,
      eventCount: events.length,
    });

    return {
      actionName: "calendar",
      success: true,
      data: {
        eventCount: events.length,
        events: events.map((e) => ({ id: e.id, title: e.title })),
      },
    };
  } catch (error) {
    logger.error("Error in calendar action:", error);
    return {
      actionName: "calendar",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract calendar events from a message with conversation context
 */
async function extractCalendarEvents(
  previousMessages: MessageContext[],
  currentMessage: MessageContext,
  messageId: string,
  participantNames: string[] = [],
  chatId?: string
): Promise<CalendarEvent[]> {
  const aiClient = getAI();
  if (!aiClient) {
    return [];
  }

  // Build context about who's in the conversation
  const participantContext =
    participantNames.length > 0
      ? `\n\nConversation participants: ${participantNames.join(", ")}. Include all participants unless specifically mentioned otherwise.`
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
        const eventDate = new Date(event.date).getTime();
        return {
          id: `event-${messageId}-${index}`,
          title: event.title,
          description: event.description,
          date: isNaN(eventDate) ? Date.now() : eventDate,
          time: event.time,
          participants:
            event.participants && event.participants.length > 0
              ? event.participants
              : participantNames,
          extractedFrom: messageId,
          chatId,
        };
      }
    );
  } catch (error) {
    logger.error("Calendar extraction error:", error);
    return [];
  }
}
