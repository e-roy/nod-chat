import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";
import { detectPriority } from "./ai/detection/priority";
import { extractCalendarEvents } from "./ai/detection/calendar";
import { isAIAvailable } from "./ai/client";
import type {
  MessageData,
  UserData,
  ChatData,
  GroupData,
  MessageContext,
} from "./types";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  try {
    initializeApp();
    logger.info("Firebase Admin initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin:", error);
  }
}

const db = getFirestore();
const messaging = getMessaging();

/**
 * Fetch message context for AI processing
 * Gets 5 previous messages before the triggered message with sender names
 */
async function fetchMessageContext(
  chatId: string,
  messageId: string,
  collectionType: "chats" | "groups"
): Promise<MessageContext[]> {
  try {
    // Get the triggered message document
    const messageDoc = await db
      .collection(collectionType)
      .doc(chatId)
      .collection("messages")
      .doc(messageId)
      .get();

    if (!messageDoc.exists) {
      return [];
    }

    const messageData = messageDoc.data() as MessageData;
    const createdAt =
      typeof messageData.createdAt === "number"
        ? messageData.createdAt
        : Date.now();

    // Fetch 5 previous messages
    const messagesSnapshot = await db
      .collection(collectionType)
      .doc(chatId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .where("createdAt", "<", createdAt)
      .limit(5)
      .get();

    if (messagesSnapshot.empty) {
      return [];
    }

    const messages: MessageContext[] = [];

    for (const doc of messagesSnapshot.docs) {
      const msgData = doc.data() as MessageData;

      // Get sender info
      const senderDoc = await db
        .collection("users")
        .doc(msgData.senderId)
        .get();
      const senderData = senderDoc.data() as UserData | undefined;
      const senderName =
        senderData?.displayName ||
        senderData?.email?.split("@")[0] ||
        "Unknown";

      if (msgData.text && msgData.text.trim() !== "") {
        messages.push({
          senderName,
          createdAt:
            typeof msgData.createdAt === "number"
              ? msgData.createdAt
              : Date.now(),
          text: msgData.text,
        });
      }
    }

    // Reverse to get chronological order
    return messages.reverse();
  } catch (error) {
    logger.error("Error fetching message context:", error);
    return [];
  }
}

/**
 * Send push notification when a new message is created in a regular chat
 */
export const onChatMessageCreated = onDocumentCreated(
  { document: "chats/{chatId}/messages/{messageId}" },
  async (event) => {
    const messageSnapshot = event.data;
    if (!messageSnapshot) {
      logger.warn("No message data in snapshot");
      return;
    }

    const messageData = messageSnapshot.data() as MessageData;
    const chatId = event.params.chatId;
    const messageId = event.params.messageId;

    logger.info(`New chat message created: ${messageId} in chat ${chatId}`, {
      senderId: messageData.senderId,
    });

    try {
      // Get chat data to find participants
      const chatDoc = await db.collection("chats").doc(chatId).get();
      if (!chatDoc.exists) {
        logger.warn(`Chat ${chatId} not found`);
        return;
      }

      const chatData = chatDoc.data() as ChatData;
      const { participants } = chatData;

      // Get sender info
      const senderDoc = await db
        .collection("users")
        .doc(messageData.senderId)
        .get();
      const senderData = senderDoc.data() as UserData | undefined;
      const senderName =
        senderData?.displayName ||
        senderData?.email?.split("@")[0] ||
        "Someone";

      // Send notification to all participants except sender
      const recipientIds = participants.filter(
        (id) => id !== messageData.senderId
      );

      await sendNotificationsToUsers(
        recipientIds,
        senderName,
        messageData.text || "📷 Image",
        chatId,
        false, // isGroup
        messageData.senderId
      );

      // Run AI operations in parallel after notification
      const aiOperations = Promise.all([
        handlePriorityDetection(messageData, messageId, chatId, "chats").catch(
          (err) => logger.error("Priority detection error:", err)
        ),
        handleCalendarExtraction(messageData, messageId, chatId, "chats").catch(
          (err) => logger.error("Calendar extraction error:", err)
        ),
      ]);

      // Don't await - let it run in background
      aiOperations.catch((err) => logger.error("AI operations error:", err));
    } catch (error) {
      logger.error(`Error sending chat message notification:`, error);
    }
  }
);

/**
 * Send push notification when a new message is created in a group
 */
export const onGroupMessageCreated = onDocumentCreated(
  { document: "groups/{groupId}/messages/{messageId}" },
  async (event) => {
    const messageSnapshot = event.data;
    if (!messageSnapshot) {
      logger.warn("No message data in snapshot");
      return;
    }

    const messageData = messageSnapshot.data() as MessageData;
    const groupId = event.params.groupId;
    const messageId = event.params.messageId;

    logger.info(`New group message created: ${messageId} in group ${groupId}`, {
      senderId: messageData.senderId,
    });

    try {
      // Get group data to find members
      const groupDoc = await db.collection("groups").doc(groupId).get();
      if (!groupDoc.exists) {
        logger.warn(`Group ${groupId} not found`);
        return;
      }

      const groupData = groupDoc.data() as GroupData;
      const { members, name: groupName } = groupData;

      // Get sender info
      const senderDoc = await db
        .collection("users")
        .doc(messageData.senderId)
        .get();
      const senderData = senderDoc.data() as UserData | undefined;
      const senderName =
        senderData?.displayName ||
        senderData?.email?.split("@")[0] ||
        "Someone";

      // Send notification to all members except sender
      const recipientIds = members.filter((id) => id !== messageData.senderId);

      await sendNotificationsToUsers(
        recipientIds,
        `${senderName} in ${groupName}`,
        messageData.text || "📷 Image",
        groupId,
        true, // isGroup
        messageData.senderId
      );

      // Run AI operations in parallel after notification
      const aiOperations = Promise.all([
        handlePriorityDetection(
          messageData,
          messageId,
          groupId,
          "groups"
        ).catch((err) => logger.error("Priority detection error:", err)),
        handleCalendarExtraction(
          messageData,
          messageId,
          groupId,
          "groups"
        ).catch((err) => logger.error("Calendar extraction error:", err)),
      ]);

      // Don't await - let it run in background
      aiOperations.catch((err) => logger.error("AI operations error:", err));
    } catch (error) {
      logger.error(`Error sending group message notification:`, error);
    }
  }
);

/**
 * Helper function to send notifications to multiple users
 */
async function sendNotificationsToUsers(
  userIds: string[],
  title: string,
  body: string,
  chatId: string,
  isGroup: boolean,
  senderId: string
): Promise<void> {
  if (userIds.length === 0) {
    logger.info("No recipients to send notifications to");
    return;
  }

  logger.info(`Sending notifications to ${userIds.length} users`, {
    userIds,
    title,
    chatId,
  });

  // Fetch FCM tokens for all recipients
  const userDocs = await Promise.all(
    userIds.map((uid) => db.collection("users").doc(uid).get())
  );

  const tokensToSend: string[] = [];
  const tokenToUser: Map<string, string> = new Map();

  userDocs.forEach((doc) => {
    if (doc.exists) {
      const userData = doc.data() as UserData;
      if (userData.fcmToken) {
        tokensToSend.push(userData.fcmToken);
        tokenToUser.set(userData.fcmToken, userData.uid);
        logger.info(`Found FCM token for user ${userData.uid}`);
      } else {
        logger.info(`No FCM token for user ${doc.id}`);
      }
    }
  });

  if (tokensToSend.length === 0) {
    logger.info("No FCM tokens found for recipients");
    return;
  }

  // Create notification payload
  const payload = {
    notification: {
      title,
      body: body.length > 100 ? body.substring(0, 97) + "..." : body,
    },
    data: {
      chatId,
      isGroup: isGroup.toString(),
      senderId,
      type: "new_message",
    },
  };

  // Send to all tokens
  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokensToSend,
      notification: payload.notification,
      data: payload.data,
      // Android-specific options
      android: {
        priority: "high",
        notification: {
          channelId: "chat_messages",
          priority: "high",
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      // iOS-specific options
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    });

    logger.info(
      `Sent ${response.successCount} notifications, ${response.failureCount} failed`
    );

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const batch = db.batch();
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const token = tokensToSend[idx];
          const userId = tokenToUser.get(token);
          if (userId) {
            logger.warn(`Removing invalid FCM token for user ${userId}`, {
              error: resp.error,
            });
            const userRef = db.collection("users").doc(userId);
            batch.update(userRef, { fcmToken: null });
          }
        }
      });
      await batch.commit();
    }
  } catch (error) {
    logger.error("Error sending FCM notifications:", error);
  }
}

/**
 * Handle priority detection for a message
 */
async function handlePriorityDetection(
  messageData: MessageData,
  messageId: string,
  chatId: string,
  collectionType: "chats" | "groups"
): Promise<void> {
  if (!isAIAvailable()) {
    logger.info("AI not available, skipping priority detection");
    return;
  }

  // Skip if no text content
  if (!messageData.text || messageData.text.trim() === "") {
    return;
  }

  try {
    // Fetch message context (5 previous messages)
    const previousMessages = await fetchMessageContext(
      messageId,
      chatId,
      collectionType
    );

    // Get sender name for current message
    const senderDoc = await db
      .collection("users")
      .doc(messageData.senderId)
      .get();
    const senderData = senderDoc.data() as UserData | undefined;
    const senderName =
      senderData?.displayName || senderData?.email?.split("@")[0] || "Unknown";

    const currentMessage = {
      senderName,
      createdAt:
        typeof messageData.createdAt === "number"
          ? messageData.createdAt
          : Date.now(),
      text: messageData.text,
    };

    // Detect priority with context
    const priorityResult = await detectPriority(
      previousMessages,
      currentMessage
    );

    if (!priorityResult.isPriority || !priorityResult.level) {
      return; // Not a priority message
    }

    const priority = {
      messageId,
      level: priorityResult.level,
      reason: priorityResult.reason || "Priority detected",
      timestamp: messageData.createdAt || Date.now(),
    };

    // Update chat priorities
    const chatPrioritiesRef = db.collection("chatPriorities").doc(chatId);

    await chatPrioritiesRef.set(
      {
        chatId,
        priorities: FieldValue.arrayUnion(priority),
        lastUpdated: Date.now(),
      },
      { merge: true }
    );

    // Get chat participants
    const chatDoc = await db.collection(collectionType).doc(chatId).get();
    let participants: string[] = [];

    if (chatDoc.exists) {
      const data = chatDoc.data();
      participants =
        collectionType === "groups"
          ? data?.members || []
          : data?.participants || [];
    }

    // Update user priorities for all participants
    const priorityWithChat = { ...priority, chatId };
    const updatePromises = participants.map(async (userId) => {
      const userPrioritiesRef = db.collection("userPriorities").doc(userId);
      await userPrioritiesRef.set(
        {
          userId,
          priorities: FieldValue.arrayUnion(priorityWithChat),
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    });

    await Promise.all(updatePromises);

    logger.info(
      `Priority detected for message ${messageId}: ${priorityResult.level}`
    );
  } catch (error) {
    logger.error("Error detecting priority:", error);
  }
}

/**
 * Handle calendar extraction for a message
 */
async function handleCalendarExtraction(
  messageData: MessageData,
  messageId: string,
  chatId: string,
  collectionType: "chats" | "groups"
): Promise<void> {
  if (!isAIAvailable()) {
    logger.info("AI not available, skipping calendar extraction");
    return;
  }

  // Skip if no text content
  if (!messageData.text || messageData.text.trim() === "") {
    return;
  }

  try {
    // Get chat participants first to include them in extraction
    const chatDoc = await db.collection(collectionType).doc(chatId).get();
    let participants: string[] = [];

    if (chatDoc.exists) {
      const data = chatDoc.data();
      participants =
        collectionType === "groups"
          ? data?.members || []
          : data?.participants || [];
    }

    // Fetch message context (5 previous messages)
    const previousMessages = await fetchMessageContext(
      messageId,
      chatId,
      collectionType
    );

    // Get sender name for current message
    const senderDoc = await db
      .collection("users")
      .doc(messageData.senderId)
      .get();
    const senderData = senderDoc.data() as UserData | undefined;
    const senderName =
      senderData?.displayName || senderData?.email?.split("@")[0] || "Unknown";

    const currentMessage = {
      senderName,
      createdAt:
        typeof messageData.createdAt === "number"
          ? messageData.createdAt
          : Date.now(),
      text: messageData.text,
    };

    // Build participant map (IDs to names) for better event storage
    const participantMap = new Map<string, string>();
    for (const participantId of participants) {
      const userDoc = await db.collection("users").doc(participantId).get();
      if (userDoc.exists) {
        const userData = userDoc.data() as UserData | undefined;
        const userName =
          userData?.displayName ||
          userData?.email?.split("@")[0] ||
          participantId;
        participantMap.set(participantId, userName);
      }
    }

    // Extract calendar events with context
    const events = await extractCalendarEvents(
      previousMessages,
      currentMessage,
      messageId,
      Array.from(participantMap.values()), // Pass names instead of IDs
      chatId
    );

    if (events.length === 0) {
      return; // No calendar events found
    }

    // Update chat calendar
    const chatCalendarRef = db.collection("chatCalendar").doc(chatId);

    await chatCalendarRef.set(
      {
        chatId,
        events: FieldValue.arrayUnion(...events),
        lastUpdated: Date.now(),
      },
      { merge: true }
    );

    // Update user calendar for all participants
    const eventsWithChat = events.map((event) => ({ ...event, chatId }));
    const updatePromises = participants.map(async (userId) => {
      const userCalendarRef = db.collection("userCalendar").doc(userId);
      await userCalendarRef.set(
        {
          userId,
          events: FieldValue.arrayUnion(...eventsWithChat),
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    });

    await Promise.all(updatePromises);

    logger.info(
      `Calendar events extracted for message ${messageId}: ${events.length} events`
    );
  } catch (error) {
    logger.error("Error extracting calendar events:", error);
  }
}
