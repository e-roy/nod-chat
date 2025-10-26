import { getAI } from "../client";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "genkit";
import { formatMessageDate, getCurrentDateContext } from "../utils";

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
