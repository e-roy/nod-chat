import { getAI } from "../client";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "genkit";

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
