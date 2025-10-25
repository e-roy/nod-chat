import * as admin from "firebase-admin";
import { Group, User } from "@chatapp/shared";
import {
  TARGET_GROUPS,
  MESSAGES_PER_GROUP_MIN,
  MESSAGES_PER_GROUP_MAX,
  DAYS_AGO_MIN,
  DAYS_AGO_MAX,
} from "../config";
import {
  generateId,
  randomInt,
  randomElements,
  getRandomTimestamp,
} from "../utils/helpers";
import { generateAIGroupName } from "../ai/genkit";
import { createMessages } from "./messages";

/**
 * Create group chats with multiple members
 */
export async function createGroups(users: User[]): Promise<void> {
  console.log("\n👥 Creating group chats...");

  const firestore = admin.firestore();
  let groupsCreated = 0;

  for (let i = 0; i < TARGET_GROUPS; i++) {
    // Pick 4-8 random members
    const memberCount = randomInt(4, Math.min(8, users.length));
    const members = randomElements(users, memberCount).filter(
      (u) => u && u.uid
    );
    const memberIds = members
      .map((u) => u.uid)
      .filter((uid) => uid !== undefined);

    // Generate group name (AI or template)
    const groupName = await generateAIGroupName();
    const groupId = generateId("group");
    const startTime = getRandomTimestamp(randomInt(DAYS_AGO_MIN, DAYS_AGO_MAX));

    const group: Group = {
      id: groupId,
      name: groupName,
      members: memberIds,
      admins: [members[0].uid], // First member is admin
      createdAt: startTime,
      updatedAt: Date.now(),
    };

    try {
      // Create group document
      await firestore.collection("groups").doc(groupId).set(group);

      // Create messages
      const messageCount = randomInt(
        MESSAGES_PER_GROUP_MIN,
        MESSAGES_PER_GROUP_MAX
      );
      const messages = await createMessages(
        groupId,
        members,
        messageCount,
        startTime,
        true
      );

      // Save messages in batch
      const batch = firestore.batch();
      for (const message of messages) {
        const messageRef = firestore
          .collection("groups")
          .doc(groupId)
          .collection("messages")
          .doc(message.id);
        batch.set(messageRef, message);
      }
      await batch.commit();

      // Update group's last message and timestamp
      const lastMessage = messages[messages.length - 1];
      await firestore.collection("groups").doc(groupId).update({
        lastMessage: lastMessage,
        updatedAt: lastMessage.createdAt,
      });

      groupsCreated++;
    } catch (error) {
      console.error(`   ✗ Failed to create group ${groupName}:`, error);
    }
  }

  console.log(`✅ Created ${groupsCreated} group chats`);
}
