import * as admin from "firebase-admin";
import { Chat, User } from "@chatapp/shared";
import {
  TARGET_ONE_ON_ONE_CHATS,
  MESSAGES_PER_CHAT_MIN,
  MESSAGES_PER_CHAT_MAX,
  DAYS_AGO_MIN,
  DAYS_AGO_MAX,
} from "../config";
import { generateId, randomInt, getRandomTimestamp } from "../utils/helpers";
import { createMessages } from "./messages";

/**
 * Create one-on-one chats between users
 */
export async function createChats(users: User[]): Promise<void> {
  console.log("\n💬 Creating one-on-one chats...");

  const firestore = admin.firestore();
  const chatPairs = new Set<string>();

  let chatsCreated = 0;

  while (
    chatsCreated < TARGET_ONE_ON_ONE_CHATS &&
    chatsCreated < users.length * 2
  ) {
    // Pick two random users
    const user1 = users[Math.floor(Math.random() * users.length)];
    const user2 = users[Math.floor(Math.random() * users.length)];

    if (!user1 || !user2 || user1.uid === user2.uid) continue;

    // Create a consistent pair ID to avoid duplicates
    const pairId = [user1.uid, user2.uid].sort().join("_");
    if (chatPairs.has(pairId)) continue;

    chatPairs.add(pairId);

    // Create chat
    const chatId = generateId("chat");
    const startTime = getRandomTimestamp(randomInt(DAYS_AGO_MIN, DAYS_AGO_MAX));

    const chat: Chat = {
      id: chatId,
      participants: [user1.uid, user2.uid],
      createdAt: startTime,
      updatedAt: Date.now(),
    };

    try {
      // Create chat document
      await firestore.collection("chats").doc(chatId).set(chat);

      // Create messages
      const messageCount = randomInt(
        MESSAGES_PER_CHAT_MIN,
        MESSAGES_PER_CHAT_MAX
      );
      const messages = await createMessages(
        chatId,
        [user1, user2],
        messageCount,
        startTime,
        false
      );

      // Save messages in batch
      const batch = firestore.batch();
      for (const message of messages) {
        const messageRef = firestore
          .collection("chats")
          .doc(chatId)
          .collection("messages")
          .doc(message.id);
        batch.set(messageRef, message);
      }
      await batch.commit();

      // Update chat's last message and timestamp
      const lastMessage = messages[messages.length - 1];
      await firestore.collection("chats").doc(chatId).update({
        lastMessage: lastMessage,
        updatedAt: lastMessage.createdAt,
      });

      chatsCreated++;
    } catch (error) {
      console.error(`   ✗ Failed to create chat between users:`, error);
    }
  }

  console.log(`✅ Created ${chatsCreated} one-on-one chats`);
}
