import * as functions from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { detectPriority, extractCalendarEvents, isAIAvailable } from "./genkit";

const db = admin.firestore();

/**
 * Detect priority in new messages from chats
 */
export const onChatMessageCreatedDetectPriority = functions.onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    await handlePriorityDetection(event, "chats");
  }
);

/**
 * Detect priority in new messages from groups
 */
export const onGroupMessageCreatedDetectPriority = functions.onDocumentCreated(
  "groups/{groupId}/messages/{messageId}",
  async (event) => {
    await handlePriorityDetection(event, "groups");
  }
);

/**
 * Extract calendar events from new chat messages
 */
export const onChatMessageCreatedExtractCalendar = functions.onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    await handleCalendarExtraction(event, "chats");
  }
);

/**
 * Extract calendar events from new group messages
 */
export const onGroupMessageCreatedExtractCalendar = functions.onDocumentCreated(
  "groups/{groupId}/messages/{messageId}",
  async (event) => {
    await handleCalendarExtraction(event, "groups");
  }
);

/**
 * Shared handler for priority detection
 */
async function handlePriorityDetection(
  event: functions.FirestoreEvent<
    any,
    { chatId?: string; groupId?: string; messageId: string }
  >,
  collectionType: "chats" | "groups"
) {
  if (!isAIAvailable()) {
    console.log("AI not available, skipping priority detection");
    return;
  }

  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const messageData = snapshot.data();
  const messageId = event.params.messageId;
  const chatId = event.params.chatId || event.params.groupId;

  if (!chatId) {
    console.error("No chatId or groupId found in event params");
    return;
  }

  // Skip if no text content
  if (!messageData.text || messageData.text.trim() === "") {
    return;
  }

  try {
    // Detect priority
    const priorityResult = await detectPriority(messageData.text);

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
        priorities: admin.firestore.FieldValue.arrayUnion(priority),
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
          priorities: admin.firestore.FieldValue.arrayUnion(priorityWithChat),
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    });

    await Promise.all(updatePromises);

    console.log(
      `Priority detected for message ${messageId}: ${priorityResult.level}`
    );
  } catch (error) {
    console.error("Error detecting priority:", error);
  }
}

/**
 * Shared handler for calendar extraction
 */
async function handleCalendarExtraction(
  event: functions.FirestoreEvent<
    any,
    { chatId?: string; groupId?: string; messageId: string }
  >,
  collectionType: "chats" | "groups"
) {
  if (!isAIAvailable()) {
    console.log("AI not available, skipping calendar extraction");
    return;
  }

  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const messageData = snapshot.data();
  const messageId = event.params.messageId;
  const chatId = event.params.chatId || event.params.groupId;

  if (!chatId) {
    console.error("No chatId or groupId found in event params");
    return;
  }

  // Skip if no text content
  if (!messageData.text || messageData.text.trim() === "") {
    return;
  }

  try {
    // Extract calendar events
    const events = await extractCalendarEvents(messageData.text, messageId);

    if (events.length === 0) {
      return; // No calendar events found
    }

    // Update chat calendar
    const chatCalendarRef = db.collection("chatCalendar").doc(chatId);

    await chatCalendarRef.set(
      {
        chatId,
        events: admin.firestore.FieldValue.arrayUnion(...events),
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

    // Update user calendar for all participants
    const eventsWithChat = events.map((event) => ({ ...event, chatId }));
    const updatePromises = participants.map(async (userId) => {
      const userCalendarRef = db.collection("userCalendar").doc(userId);
      await userCalendarRef.set(
        {
          userId,
          events: admin.firestore.FieldValue.arrayUnion(...eventsWithChat),
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    });

    await Promise.all(updatePromises);

    console.log(
      `Calendar events extracted for message ${messageId}: ${events.length} events`
    );
  } catch (error) {
    console.error("Error extracting calendar events:", error);
  }
}
