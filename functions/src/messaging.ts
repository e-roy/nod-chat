import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";

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

interface MessageData {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  imageUrl?: string | null;
  createdAt: any;
  status?: string;
  readBy?: string[];
}

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  fcmToken?: string;
}

interface ChatData {
  id: string;
  participants: string[];
  name?: string;
}

interface GroupData {
  id: string;
  members: string[];
  name: string;
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
