import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import * as dotenv from "dotenv";

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

  const messagesText = messages
    .map((m) => `[${new Date(m.createdAt).toLocaleString()}] ${m.text}`)
    .join("\n");

  const prompt = `You are analyzing a work chat conversation for a remote team.
Generate a concise summary (2-3 sentences) that captures the main topics, decisions, and action items discussed.

Conversation:
${messagesText}

Summary:`;

  const result = await aiClient.generate({
    model: googleAI.model("gemini-2.0-flash-exp"),
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
  Array<{ id: string; text: string; assignee?: string; status: string }>
> {
  const aiClient = getAI();
  if (!aiClient) {
    throw new Error("AI not available");
  }

  const messagesText = messages
    .map((m) => {
      const userName = userMap.get(m.senderId) || m.senderId;
      return `[${userName}] ${m.text}`;
    })
    .join("\n");

  const ActionItemSchema = z.object({
    actionItems: z.array(
      z.object({
        text: z.string().describe("The action item description"),
        assignee: z
          .string()
          .optional()
          .describe("Person assigned (if mentioned)"),
      })
    ),
  });

  const prompt = `You are analyzing a work chat for a remote team.
Extract all action items, tasks, todos, and commitments mentioned.

Conversation:
${messagesText}

Extract action items with clear descriptions. If someone is assigned, include their name.
Return ONLY actionable items that require follow-up.`;

  const result = await aiClient.generate({
    model: googleAI.model("gemini-2.0-flash-exp"),
    prompt,
    output: { schema: ActionItemSchema },
  });

  const items = result.output?.actionItems || [];
  return items.map((item: any, index: number) => ({
    id: `action-${Date.now()}-${index}`,
    text: item.text,
    assignee: item.assignee,
    status: "pending",
  }));
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
    .map((m) => `[${new Date(m.createdAt).toLocaleString()}] ${m.text}`)
    .join("\n");

  const DecisionSchema = z.object({
    decisions: z.array(
      z.object({
        subject: z.string().describe("Topic or area of the decision"),
        decision: z.string().describe("The decision made"),
        timestamp: z
          .string()
          .describe("Approximate time (relative or absolute)"),
      })
    ),
  });

  const subjectFilter = subject
    ? `Focus on decisions related to: ${subject}`
    : "";

  const prompt = `You are analyzing a work chat for a remote team.
Extract all decisions, agreements, and conclusions reached.

${subjectFilter}

Conversation:
${messagesText}

Identify clear decisions made by the team. Group by subject/topic.`;

  const result = await aiClient.generate({
    model: googleAI.model("gemini-2.0-flash-exp"),
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
    model: googleAI.model("gemini-2.0-flash-exp"),
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
      model: googleAI.model("gemini-2.0-flash-exp"),
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
      model: googleAI.model("gemini-2.0-flash-exp"),
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
