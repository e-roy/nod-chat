import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import * as dotenv from "dotenv";
import { formatMessageDate, getCurrentDateContext } from "./dateUtils";

// Load environment variables from .env.local if it exists
dotenv.config({ path: ".env.local" });

let ai: any = null;

/**
 * Initialize Firebase Genkit with Google AI
 */
export function initializeGenkit(): void {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn("⚠️  GOOGLE_API_KEY not set. AI features disabled.");
    return;
  }

  try {
    ai = genkit({
      plugins: [
        googleAI({
          apiKey,
        }),
      ],
    });
    console.log("✅ Firebase Genkit initialized with Google AI");
  } catch (error) {
    console.error("❌ Failed to initialize Genkit:", error);
  }
}

/**
 * Get the AI client instance
 */
export function getAI() {
  if (!ai) {
    initializeGenkit();
  }
  return ai;
}

/**
 * Check if AI is available
 */
export function isAIAvailable(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}

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

/**
 * Extract action items from messages
 */
export async function extractActionItems(
  messages: Array<{ senderId: string; text: string; createdAt: number }>,
  userMap: Map<string, string>
): Promise<
  Array<{
    id: string;
    text: string;
    assignee?: string;
    status: string;
    dueDate?: number;
  }>
> {
  const aiClient = getAI();
  if (!aiClient) {
    throw new Error("AI not available");
  }

  const currentDateTime = getCurrentDateContext();
  const messagesText = messages
    .map((m) => {
      const userName = userMap.get(m.senderId) || m.senderId;
      const dateStr = formatMessageDate(m.createdAt);
      return `[${dateStr}] [${userName}] ${m.text}`;
    })
    .join("\n");

  const ActionItemSchema = z.object({
    actionItems: z.array(
      z.object({
        text: z
          .string()
          .describe("The action item description with resolved dates"),
        assignee: z
          .string()
          .optional()
          .describe("Person assigned (if mentioned)"),
        status: z
          .enum(["pending", "done"])
          .describe(
            "Status: 'pending' for incomplete, 'done' for completed items"
          ),
        dueDate: z
          .string()
          .optional()
          .describe(
            "Due date in ISO format (YYYY-MM-DD) if mentioned in the conversation"
          ),
      })
    ),
  });

  const prompt = `You are analyzing a work chat for a remote team.
Extract all action items, tasks, todos, and commitments mentioned.

Current date/time for context: ${currentDateTime}

CRITICAL INSTRUCTIONS:
1. Extract deadlines, due dates, or time commitments and include them in the dueDate field (YYYY-MM-DD format)
2. When a message contains relative terms like "tomorrow", "today", "next week", etc., you MUST resolve these to actual dates based on the message timestamp
3. Example: If a message dated "Mar 15, 3:45 PM" says "deadline is tomorrow", the dueDate should be "2024-03-16"
4. For non-time-sensitive action items, leave dueDate empty
5. The action item text should be clear and actionable, WITHOUT including the date in the text itself - use the dueDate field
6. If someone is assigned to the task, include their name in assignee
7. Set status to "done" if the conversation indicates the task/action has been completed, otherwise use "pending"

Conversation:
${messagesText}

Extract action items with clear descriptions, resolved due dates, assignments, and completion status.
Return ONLY actionable items that require follow-up.`;

  const result = await aiClient.generate({
    model: googleAI.model("gemini-2.5-flash-lite"),
    prompt,
    output: { schema: ActionItemSchema },
  });

  const items = result.output?.actionItems || [];

  if (items.length === 0) {
    return [];
  }

  // Validate and process items
  const processedItems = items
    .map((item: any, index: number) => {
      // Validate required fields
      if (!item.text) {
        return null;
      }

      // Parse due date if provided
      let dueDateTimestamp: number | undefined;
      if (item.dueDate && typeof item.dueDate === "string") {
        const parsed = Date.parse(item.dueDate);
        if (!isNaN(parsed)) {
          dueDateTimestamp = parsed;
        }
      }

      // Validate status
      const status = (item.status === "done" ? "done" : "pending") as
        | "pending"
        | "done";

      return {
        id: `action-${Date.now()}-${index}`,
        text: item.text,
        assignee: item.assignee || undefined,
        status: status,
        dueDate: dueDateTimestamp,
      };
    })
    .filter((item: any) => item !== null);

  return processedItems;
}

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

  const messagesText = messages
    .map((m) => `[${formatMessageDate(m.createdAt)}] ${m.text}`)
    .join("\n");

  const DecisionSchema = z.object({
    decisions: z.array(
      z.object({
        subject: z.string().describe("Topic or area of the decision"),
        decision: z.string().describe("The decision made"),
        timestamp: z
          .string()
          .describe("Actual date and time when the decision was made"),
      })
    ),
  });

  const subjectFilter = subject
    ? `Focus on decisions related to: ${subject}`
    : "";

  const prompt = `You are analyzing a work chat for a remote team.
Extract all decisions, agreements, and conclusions reached.

${subjectFilter}

IMPORTANT: Use the actual dates and times from the conversation. Do NOT use relative terms like "yesterday" or "today" - use the exact dates provided.

Conversation:
${messagesText}

Identify clear decisions made by the team. Group by subject/topic. Include the exact date and time from the conversation when each decision was made.`;

  const result = await aiClient.generate({
    model: googleAI.model("gemini-2.5-flash-lite"),
    prompt,
    output: { schema: DecisionSchema },
  });

  const decisions = result.output?.decisions || [];
  return decisions.map((item: any, index: number) => ({
    id: `decision-${Date.now()}-${index}`,
    subject: item.subject,
    decision: item.decision,
    timestamp: Date.now(),
  }));
}

/**
 * Semantic search in messages
 */
export async function searchMessages(
  messages: Array<{
    id: string;
    senderId: string;
    text: string;
    createdAt: number;
  }>,
  query: string
): Promise<Array<{ messageId: string; relevance: number; snippet: string }>> {
  const aiClient = getAI();
  if (!aiClient) {
    throw new Error("AI not available");
  }

  const messagesText = messages
    .map((m, idx) => `[${idx}] ${m.text}`)
    .join("\n");

  const SearchResultSchema = z.object({
    results: z.array(
      z.object({
        index: z.number().describe("Message index from the conversation"),
        relevance: z.number().min(0).max(100).describe("Relevance score 0-100"),
        snippet: z.string().describe("Brief explanation of relevance"),
      })
    ),
  });

  const prompt = `You are searching a work chat conversation.
Find messages most relevant to the query: "${query}"

Conversation:
${messagesText}

Return the top 5 most relevant messages with their index, relevance score (0-100), and a brief snippet explaining why it's relevant.`;

  const result = await aiClient.generate({
    model: googleAI.model("gemini-2.5-flash-lite"),
    prompt,
    output: { schema: SearchResultSchema },
  });

  const results = result.output?.results || [];
  return results
    .map((item: any) => ({
      messageId: messages[item.index]?.id || "",
      relevance: item.relevance,
      snippet: item.snippet,
    }))
    .filter((r: any) => r.messageId);
}

/**
 * Detect priority level in a message
 */
export async function detectPriority(messageText: string): Promise<{
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

  const prompt = `You are analyzing a work message for priority/urgency.
Detect if this message contains:
- Urgent requests or blockers
- Critical bugs or issues
- Deadlines or time-sensitive matters
- "ASAP", "urgent", "critical", "blocker" keywords
- Questions needing immediate attention

Message: "${messageText}"

Determine if this is a priority message and classify its level.`;

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

/**
 * Extract calendar events from a message
 */
export async function extractCalendarEvents(
  messageText: string,
  messageId: string
): Promise<
  Array<{
    id: string;
    title: string;
    date: number;
    time?: string;
    participants?: string[];
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
          .describe("Mentioned participants"),
      })
    ),
  });

  const prompt = `You are extracting calendar events from a work message.
Identify any:
- Meeting invitations
- Scheduled events
- Deadlines with dates
- Time-based commitments

Message: "${messageText}"

Extract events with dates and times. If no specific events are mentioned, return an empty array.`;

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
        participants: event.participants,
        extractedFrom: messageId,
      };
    });
  } catch (error) {
    console.error("Calendar extraction error:", error);
    return [];
  }
}
