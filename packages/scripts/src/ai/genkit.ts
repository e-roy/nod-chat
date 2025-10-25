import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { User } from "@chatapp/shared";
import { USE_AI, GOOGLE_API_KEY } from "../config";
import { generateRealisticMessage, generateGroupName } from "../utils/messages";

let ai: any = null;

// Schema for a conversation message
const ConversationMessageSchema = z.object({
  sender: z.string().describe("The name of the person sending the message"),
  text: z.string().describe("The message text"),
  hasImage: z
    .boolean()
    .describe("Whether this message should include an image"),
});

// Schema for a complete conversation
const ConversationSchema = z.object({
  messages: z
    .array(ConversationMessageSchema)
    .describe("An array of messages in chronological order"),
});

/**
 * Initialize Firebase Genkit with Google AI
 */
export function initializeGenkit(): void {
  if (!USE_AI) return;

  if (!GOOGLE_API_KEY) {
    console.warn("⚠️  GOOGLE_API_KEY not set. AI generation disabled.");
    console.warn("   Set with: export GOOGLE_API_KEY=your_key_here");
    return;
  }

  try {
    ai = genkit({
      plugins: [
        googleAI({
          apiKey: GOOGLE_API_KEY,
        }),
      ],
    });
    console.log(
      "✅ Firebase Genkit initialized with Google AI (Gemini 2.5 Flash)"
    );
  } catch (error) {
    console.warn("⚠️  Failed to initialize Genkit:", error);
    console.warn("   Falling back to template-based generation");
  }
}

/**
 * Generate AI-powered messages for a conversation
 */
export async function generateAIMessages(
  participants: User[],
  count: number,
  isGroup: boolean
): Promise<Array<{ sender: User; text: string; hasImage: boolean }>> {
  if (!ai || !USE_AI || !GOOGLE_API_KEY) {
    // Fallback to template-based generation
    return Array.from({ length: count }, () => ({
      sender: participants[Math.floor(Math.random() * participants.length)],
      text: generateRealisticMessage(),
      hasImage: Math.random() < 0.2,
    }));
  }

  try {
    const participantNames = participants.map((p) => p.displayName).join(", ");
    const chatType = isGroup ? "group chat" : "one-on-one conversation";

    const prompt = `Generate a realistic professional work conversation for a ${chatType} between ${participantNames}.

Context: This is a remote team collaboration tool. The conversation should reflect:
- Project updates and status reports
- Meeting coordination  
- Code reviews and technical discussions
- Time-based updates (lunch, OOO, logging off)
- Team collaboration and questions
- Casual team culture moments

Requirements:
- Generate EXACTLY ${count} messages in chronological order
- Messages should build on each other naturally (like a real conversation)
- Keep messages short and natural (1-2 sentences max)
- Mix formal and informal tones
- Include occasional emojis (👍, 🎉, ☕, etc.)
- Reference realistic work scenarios (deployments, PRs, bugs, features)
- Some messages should mention specific times or days
- Vary message length and complexity
- About 20% of messages should include images (screenshots, diagrams, etc.)
- Alternate between participants naturally

Generate a contextual, realistic conversation where messages reference and respond to previous messages.`;

    const result = await ai.generate({
      model: googleAI.model("gemini-2.5-flash"),
      prompt: prompt,
      output: { schema: ConversationSchema },
    });

    if (!result.output || !result.output.messages) {
      throw new Error("No structured output received");
    }

    // Map AI output to our format
    const messages = result.output.messages.map((msg: any) => {
      // Find participant by name (case-insensitive match)
      const sender =
        participants.find(
          (p) => p.displayName?.toLowerCase() === msg.sender.toLowerCase()
        ) || participants[Math.floor(Math.random() * participants.length)];

      return {
        sender,
        text: msg.text,
        hasImage: msg.hasImage || false,
      };
    });

    // Ensure we have exactly the requested count
    while (messages.length < count) {
      messages.push({
        sender: participants[Math.floor(Math.random() * participants.length)],
        text: generateRealisticMessage(),
        hasImage: Math.random() < 0.2,
      });
    }

    return messages.slice(0, count);
  } catch (error) {
    console.warn("⚠️  AI generation failed, using templates:", error);
    return Array.from({ length: count }, () => ({
      sender: participants[Math.floor(Math.random() * participants.length)],
      text: generateRealisticMessage(),
      hasImage: Math.random() < 0.2,
    }));
  }
}

/**
 * Generate AI-powered group name
 */
export async function generateAIGroupName(): Promise<string> {
  if (!ai || !USE_AI || !GOOGLE_API_KEY) {
    return generateGroupName();
  }

  try {
    const prompt = `Generate 1 realistic professional team group chat name for a remote work collaboration app.

Examples of good names:
- Engineering Team
- Frontend Squad
- Project Apollo
- Q2 Planning
- San Francisco Office
- Mobile Dev Team
- All Hands
- Design Sync

Return ONLY the group name, nothing else.`;

    const result = await ai.generate({
      model: googleAI.model("gemini-2.5-flash"),
      prompt: prompt,
    });

    const name = result.text?.trim() || "";

    return name || "Team Chat";
  } catch (error) {
    console.warn("⚠️  AI group name generation failed, using template");
    return generateGroupName();
  }
}
