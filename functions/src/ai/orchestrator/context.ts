import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import type {
  EnrichedContext,
  MessageContext,
  CurrentMessageContext,
  ParticipantInfo,
} from "./types";
import type { MessageData, UserData } from "../../types";
import type { ProcessMessageParams } from "./types";

const db = getFirestore();

/**
 * Fetch enriched context for message processing
 * - Message history (configurable depth)
 * - Participant information
 * - Sender data
 * - Chat metadata
 */
export async function fetchEnrichedContext(
  params: ProcessMessageParams,
  historyDepth = 5
): Promise<EnrichedContext> {
  try {
    const { messageData, messageId, chatId, collectionType } = params;

    // Fetch chat/group document
    const chatDoc = await db.collection(collectionType).doc(chatId).get();

    if (!chatDoc.exists) {
      throw new Error(`Chat/group ${chatId} not found`);
    }

    const chatData = chatDoc.data();
    const participants =
      collectionType === "groups"
        ? (chatData?.members as string[]) || []
        : (chatData?.participants as string[]) || [];

    // Fetch sender information
    const senderDoc = await db
      .collection("users")
      .doc(messageData.senderId)
      .get();
    const senderData = senderDoc.data() as UserData | undefined;
    const senderName =
      senderData?.displayName || senderData?.email?.split("@")[0] || "Unknown";

    // Create current message context
    const createdAt =
      typeof messageData.createdAt === "number"
        ? messageData.createdAt
        : Date.now();

    const currentMessage: CurrentMessageContext = {
      senderId: messageData.senderId,
      senderName,
      createdAt,
      text: messageData.text || "",
      messageId,
    };

    // Fetch previous messages if depth > 0
    const previousMessages: MessageContext[] = await fetchMessageHistory(
      chatId,
      collectionType,
      createdAt,
      historyDepth
    );

    // Fetch participant information
    const participantInfo = await fetchParticipantInfo(participants);

    return {
      currentMessage,
      previousMessages,
      participants: participantInfo,
      chatMetadata: {
        chatId,
        collectionType,
        isGroup: collectionType === "groups",
      },
    };
  } catch (error) {
    logger.error("Error fetching enriched context:", error);
    throw error;
  }
}

/**
 * Fetch message history for context
 */
async function fetchMessageHistory(
  chatId: string,
  collectionType: "chats" | "groups",
  createdAt: number,
  limit: number
): Promise<MessageContext[]> {
  if (limit <= 0) {
    return [];
  }

  try {
    const messagesSnapshot = await db
      .collection(collectionType)
      .doc(chatId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .where("createdAt", "<", createdAt)
      .limit(limit)
      .get();

    if (messagesSnapshot.empty) {
      return [];
    }

    const messages: MessageContext[] = [];
    const senderMap = new Map<string, string>();

    for (const doc of messagesSnapshot.docs) {
      const msgData = doc.data() as MessageData;

      // Get sender name (with caching)
      if (!senderMap.has(msgData.senderId)) {
        const senderDoc = await db
          .collection("users")
          .doc(msgData.senderId)
          .get();
        const senderData = senderDoc.data() as UserData | undefined;
        const senderName =
          senderData?.displayName ||
          senderData?.email?.split("@")[0] ||
          "Unknown";
        senderMap.set(msgData.senderId, senderName);
      }

      const senderName = senderMap.get(msgData.senderId)!;
      const msgCreatedAt =
        typeof msgData.createdAt === "number" ? msgData.createdAt : Date.now();

      if (msgData.text && msgData.text.trim() !== "") {
        messages.push({
          senderName,
          createdAt: msgCreatedAt,
          text: msgData.text,
        });
      }
    }

    // Reverse to chronological order
    return messages.reverse();
  } catch (error) {
    logger.error("Error fetching message history:", error);
    return [];
  }
}

/**
 * Fetch participant information
 */
async function fetchParticipantInfo(
  participantIds: string[]
): Promise<ParticipantInfo[]> {
  try {
    const participantDocs = await Promise.all(
      participantIds.map((uid) => db.collection("users").doc(uid).get())
    );

    return participantDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const userData = doc.data() as UserData;
        const name =
          userData.displayName || userData.email?.split("@")[0] || "Unknown";
        return {
          userId: doc.id,
          name,
        };
      });
  } catch (error) {
    logger.error("Error fetching participant info:", error);
    return [];
  }
}
