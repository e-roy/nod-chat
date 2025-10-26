import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  generateSummary,
  extractActionItems,
  extractDecisions,
  searchMessages,
  isAIAvailable,
} from "./genkit";

const db = admin.firestore();

interface GenerateSummaryRequest {
  chatId: string;
  forceRefresh?: boolean;
}

interface ExtractActionItemsRequest {
  chatId: string;
  forceRefresh?: boolean;
}

interface ExtractDecisionsRequest {
  chatId: string;
  subject?: string;
}

interface SearchMessagesRequest {
  chatId: string;
  query: string;
}

/**
 * Generate chat summary - Callable function
 */
export const generateChatSummary = onCall<GenerateSummaryRequest>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!isAIAvailable()) {
      throw new HttpsError("failed-precondition", "AI service not available");
    }

    const { chatId, forceRefresh } = request.data;

    if (!chatId) {
      throw new HttpsError("invalid-argument", "chatId is required");
    }

    try {
      // Check cache first
      const aiDocRef = db.collection("chatAI").doc(chatId);
      const aiDoc = await aiDocRef.get();

      if (!forceRefresh && aiDoc.exists) {
        const cachedData = aiDoc.data();
        if (cachedData?.summary) {
          return { summary: cachedData.summary };
        }
      }

      // Determine if this is a group or regular chat
      const isGroup = chatId.startsWith("group_");
      const parentCollection = isGroup ? "groups" : "chats";

      // Fetch last 300 messages from subcollection
      const messagesSnapshot = await db
        .collection(parentCollection)
        .doc(chatId)
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(300)
        .get();

      if (messagesSnapshot.empty) {
        return { summary: "No messages to summarize" };
      }

      const messages = messagesSnapshot.docs
        .map((doc) => doc.data())
        .reverse()
        .map((msg) => ({
          senderId: msg.senderId,
          text: msg.text || "",
          createdAt: msg.createdAt,
        }));

      const summary = await generateSummary(messages);

      const messageCount = messages.length;

      // Update cache in chatAI collection
      await aiDocRef.set(
        {
          chatId,
          summary,
          lastUpdated: Date.now(),
          messageCount,
          messageCountAtSummary: messageCount,
        },
        { merge: true }
      );

      return { summary, messageCount };
    } catch (error) {
      console.error("Error generating summary:", error);
      throw new HttpsError("internal", "Failed to generate summary");
    }
  }
);

/**
 * Extract action items - Callable function
 */
export const extractChatActionItems = onCall<ExtractActionItemsRequest>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!isAIAvailable()) {
      throw new HttpsError("failed-precondition", "AI service not available");
    }

    const { chatId, forceRefresh } = request.data;

    if (!chatId) {
      throw new HttpsError("invalid-argument", "chatId is required");
    }

    try {
      // Check cache first
      const aiDocRef = db.collection("chatAI").doc(chatId);
      const aiDoc = await aiDocRef.get();

      if (!forceRefresh && aiDoc.exists) {
        const cachedData = aiDoc.data();
        if (cachedData?.actionItems && cachedData.actionItems.length > 0) {
          return { actionItems: cachedData.actionItems };
        }
      }

      // Determine if this is a group or regular chat
      const isGroup = chatId.startsWith("group_");
      const parentCollection = isGroup ? "groups" : "chats";

      // Fetch last 300 messages from subcollection
      const messagesSnapshot = await db
        .collection(parentCollection)
        .doc(chatId)
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(300)
        .get();

      if (messagesSnapshot.empty) {
        return { actionItems: [] };
      }

      const messages = messagesSnapshot.docs
        .map((doc) => doc.data())
        .reverse()
        .map((msg) => ({
          senderId: msg.senderId,
          text: msg.text || "",
          createdAt: msg.createdAt,
        }));

      // Build user map for better assignee detection
      const userIds = [...new Set(messages.map((m) => m.senderId))];
      const userMap = new Map<string, string>();

      for (const uid of userIds) {
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userMap.set(uid, userData?.displayName || userData?.email || uid);
        }
      }

      const actionItems = await extractActionItems(messages, userMap);

      const messageCount = messages.length;

      // Update cache
      await aiDocRef.set(
        {
          chatId,
          actionItems,
          lastUpdated: Date.now(),
          messageCount,
          messageCountAtActionItems: messageCount,
        },
        { merge: true }
      );

      return { actionItems, messageCount };
    } catch (error) {
      console.error("Error extracting action items:", error);
      throw new HttpsError("internal", "Failed to extract action items");
    }
  }
);

/**
 * Extract decisions - Callable function
 */
export const extractChatDecisions = onCall<ExtractDecisionsRequest>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!isAIAvailable()) {
      throw new HttpsError("failed-precondition", "AI service not available");
    }

    const { chatId, subject } = request.data;

    if (!chatId) {
      throw new HttpsError("invalid-argument", "chatId is required");
    }

    try {
      // Determine if this is a group or regular chat
      const isGroup = chatId.startsWith("group_");
      const parentCollection = isGroup ? "groups" : "chats";

      // Fetch last 100 messages from subcollection
      const messagesSnapshot = await db
        .collection(parentCollection)
        .doc(chatId)
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

      if (messagesSnapshot.empty) {
        return { decisions: [] };
      }

      const messages = messagesSnapshot.docs
        .map((doc) => doc.data())
        .reverse()
        .map((msg) => ({
          senderId: msg.senderId,
          text: msg.text || "",
          createdAt: msg.createdAt,
        }));

      const decisions = await extractDecisions(messages, subject);

      // Update cache
      const aiDocRef = db.collection("chatAI").doc(chatId);
      await aiDocRef.set(
        {
          chatId,
          decisions,
          lastUpdated: Date.now(),
          messageCount: messages.length,
        },
        { merge: true }
      );

      return { decisions };
    } catch (error) {
      console.error("Error extracting decisions:", error);
      throw new HttpsError("internal", "Failed to extract decisions");
    }
  }
);

/**
 * Search chat messages - Callable function
 */
export const searchChatMessages = onCall<SearchMessagesRequest>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!isAIAvailable()) {
      throw new HttpsError("failed-precondition", "AI service not available");
    }

    const { chatId, query } = request.data;

    if (!chatId || !query) {
      throw new HttpsError("invalid-argument", "chatId and query are required");
    }

    try {
      // Determine if this is a group or regular chat
      const isGroup = chatId.startsWith("group_");
      const parentCollection = isGroup ? "groups" : "chats";

      // Fetch all messages from chat subcollection
      const messagesSnapshot = await db
        .collection(parentCollection)
        .doc(chatId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .get();

      if (messagesSnapshot.empty) {
        return { results: [] };
      }

      const messages = messagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        senderId: doc.data().senderId,
        text: doc.data().text || "",
        createdAt: doc.data().createdAt,
      }));

      const results = await searchMessages(messages, query);

      return { results };
    } catch (error) {
      console.error("Error searching messages:", error);
      throw new HttpsError("internal", "Failed to search messages");
    }
  }
);
