import { ChatMessage, User } from "@chatapp/shared";
import { IMAGE_PROBABILITY } from "../config";
import {
  generateId,
  randomInt,
  randomElement,
  randomElements,
  generateImageUrl,
} from "../utils/helpers";
import { generateAIMessages } from "../ai/genkit";

/**
 * Create messages for a chat or group
 */
export async function createMessages(
  chatId: string,
  participants: User[],
  count: number,
  startTime: number,
  isGroup: boolean
): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [];

  // Generate entire conversation at once using AI or templates
  const conversationMessages = await generateAIMessages(
    participants,
    count,
    isGroup
  );

  // Spread messages more realistically over time
  // Messages should cluster in bursts with gaps, simulating real conversations
  const now = Date.now();
  const totalTimespan = now - startTime; // Full time from start to now

  let currentTime = startTime;

  for (let i = 0; i < conversationMessages.length; i++) {
    const { sender, text, hasImage } = conversationMessages[i];

    // Add variable time gaps between messages
    // Some messages are quick (seconds/minutes), others have longer gaps (hours/days)
    const timeGap =
      Math.random() < 0.7
        ? randomInt(60000, 1800000) // 70% chance: 1-30 minutes (active conversation)
        : randomInt(3600000, 43200000); // 30% chance: 1-12 hours (conversation pause)

    currentTime += timeGap;

    // Ensure we don't go past current time
    const messageTime = Math.min(currentTime, now);

    const message: ChatMessage = {
      id: generateId("msg"),
      chatId,
      senderId: sender.uid,
      text: text,
      imageUrl: hasImage ? generateImageUrl(i + Date.now()) : null,
      createdAt: messageTime,
      status: "read",
    };

    // For group messages, add readBy array
    if (isGroup) {
      // Simulate that some users have read the message (random subset)
      const readByCount = randomInt(1, participants.length);
      message.readBy = randomElements(
        participants.map((p) => p.uid),
        readByCount
      );
    }

    messages.push(message);
  }

  // Sort messages by timestamp
  messages.sort((a, b) => a.createdAt - b.createdAt);

  return messages;
}
