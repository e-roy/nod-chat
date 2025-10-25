import * as admin from "firebase-admin";
import { faker } from "@faker-js/faker";

// ============================================================================
// Configuration
// ============================================================================

const EMULATOR_CONFIG = {
  authPort: 9099,
  firestorePort: 8080,
  storagePort: 9199,
  databasePort: 9000,
  host: "localhost",
};

// 30 common first names for test users
const FIRST_NAMES = [
  "Alice",
  "Bob",
  "Charlie",
  "David",
  "Emma",
  "Frank",
  "Grace",
  "Henry",
  "Ivy",
  "Jack",
  "Kate",
  "Liam",
  "Mia",
  "Noah",
  "Olivia",
  "Peter",
  "Quinn",
  "Rachel",
  "Sam",
  "Tina",
  "Uma",
  "Victor",
  "Wendy",
  "Xavier",
  "Yara",
  "Zoe",
  "Alex",
  "Blake",
  "Casey",
  "Drew",
];

const DEFAULT_PASSWORD = "password";

// Data generation targets (medium volume)
const TARGET_ONE_ON_ONE_CHATS = 18;
const TARGET_GROUPS = 6;
const MESSAGES_PER_CHAT_MIN = 20;
const MESSAGES_PER_CHAT_MAX = 50;
const MESSAGES_PER_GROUP_MIN = 30;
const MESSAGES_PER_GROUP_MAX = 50;
const IMAGE_PROBABILITY = 0.2; // 20% of messages have images

// Time ranges for realistic timestamps
const DAYS_AGO_MIN = 1;
const DAYS_AGO_MAX = 7;

// ============================================================================
// Types (matching shared types)
// ============================================================================

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  online: boolean;
  lastSeen?: number;
  createdAt: number;
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  imageUrl?: string | null;
  createdAt: number;
  status?: "sending" | "sent" | "delivered" | "read";
  readBy?: string[]; // for group messages
}

interface Chat {
  id: string;
  name?: string;
  participants: string[];
  lastMessage?: ChatMessage;
  createdAt: number;
  updatedAt: number;
}

interface Group {
  id: string;
  name: string;
  photoURL?: string;
  members: string[];
  admins: string[];
  lastMessage?: ChatMessage;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${faker.string.uuid()}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomTimestamp(daysAgo: number = 7): number {
  const now = Date.now();
  const maxOffset = daysAgo * 24 * 60 * 60 * 1000;
  const offset = Math.random() * maxOffset;
  return now - offset;
}

function generateRealisticMessage(): string {
  const templates = [
    () => faker.lorem.sentence(),
    () => faker.hacker.phrase(),
    () => `Hey! ${faker.lorem.sentences(1)}`,
    () => `Did you see ${faker.lorem.words(3)}?`,
    () => `That's amazing! ${faker.lorem.sentence()}`,
    () => `I think ${faker.lorem.sentence()}`,
    () => `Just finished ${faker.lorem.words(4)}`,
    () => `Looking forward to ${faker.lorem.words(3)}!`,
    () => `Thanks for ${faker.lorem.words(2)}!`,
    () => `Can we talk about ${faker.lorem.words(3)}?`,
    () => `😊 ${faker.lorem.sentence()}`,
    () => `👍 Sounds good!`,
    () => `Let me know if you need ${faker.lorem.words(2)}`,
    () => `Perfect! ${faker.lorem.sentence()}`,
    () => `I'll get back to you about ${faker.lorem.words(3)}`,
    () => faker.company.catchPhrase(),
    () => `Working on ${faker.lorem.words(3)} today`,
    () => `Have you tried ${faker.lorem.words(2)}?`,
    () => `Really excited about ${faker.lorem.words(3)}!`,
    () => `What do you think about ${faker.lorem.words(3)}?`,
  ];

  return randomElement(templates)();
}

function generateImageUrl(seed: number): string {
  return `https://picsum.photos/400/300?random=${seed}`;
}

// ============================================================================
// Firebase Initialization
// ============================================================================

async function initializeAdmin(): Promise<void> {
  console.log("🔧 Initializing Firebase Admin SDK...");

  // Initialize without credentials for emulator
  admin.initializeApp({
    projectId: "message-ai-b426b",
  });

  // Connect to emulators
  process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_CONFIG.host}:${EMULATOR_CONFIG.firestorePort}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_CONFIG.host}:${EMULATOR_CONFIG.authPort}`;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${EMULATOR_CONFIG.host}:${EMULATOR_CONFIG.storagePort}`;
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = `${EMULATOR_CONFIG.host}:${EMULATOR_CONFIG.databasePort}`;

  console.log("✅ Connected to Firebase Emulators");
  console.log(`   - Auth: ${EMULATOR_CONFIG.host}:${EMULATOR_CONFIG.authPort}`);
  console.log(
    `   - Firestore: ${EMULATOR_CONFIG.host}:${EMULATOR_CONFIG.firestorePort}`
  );
}

// ============================================================================
// User Creation
// ============================================================================

async function createUsers(): Promise<User[]> {
  console.log("\n👥 Creating users...");

  const auth = admin.auth();
  const firestore = admin.firestore();
  const users: User[] = [];

  for (const firstName of FIRST_NAMES) {
    const email = `${firstName.toLowerCase()}@${firstName.toLowerCase()}.com`;
    const displayName = firstName;

    try {
      // Create auth user
      const userRecord = await auth.createUser({
        email,
        password: DEFAULT_PASSWORD,
        displayName,
      });

      // Create user document in Firestore
      const user: User = {
        uid: userRecord.uid,
        email,
        displayName,
        online: false,
        createdAt: Date.now(),
      };

      await firestore.collection("users").doc(userRecord.uid).set(user);
      users.push(user);
    } catch (error) {
      console.error(`   ✗ Failed to create user ${displayName}:`, error);
    }
  }

  console.log(`✅ Created ${users.length} users`);
  return users;
}

// ============================================================================
// One-on-One Chat Creation
// ============================================================================

async function createOneOnOneChats(users: User[]): Promise<void> {
  console.log(`\n💬 Creating ${TARGET_ONE_ON_ONE_CHATS} one-on-one chats...`);

  const firestore = admin.firestore();
  const usedPairs = new Set<string>();

  for (let i = 0; i < TARGET_ONE_ON_ONE_CHATS; i++) {
    // Pick two random users who haven't chatted yet
    let user1: User, user2: User, pairKey: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      user1 = randomElement(users);
      user2 = randomElement(users.filter((u) => u.uid !== user1.uid));
      const sortedPair = [user1.uid, user2.uid].sort();
      pairKey = sortedPair.join("-");
      attempts++;

      if (attempts >= maxAttempts) {
        console.log(`   ⚠ Could only create ${i} unique chats`);
        return;
      }
    } while (usedPairs.has(pairKey));

    usedPairs.add(pairKey);

    const chatId = generateId("chat");
    const messageCount = randomInt(
      MESSAGES_PER_CHAT_MIN,
      MESSAGES_PER_CHAT_MAX
    );
    const chatCreatedAt = getRandomTimestamp(DAYS_AGO_MAX);

    // Generate messages
    const messages = await createMessages(
      chatId,
      [user1, user2],
      messageCount,
      chatCreatedAt,
      false
    );

    // Create chat document
    const lastMessage = messages[messages.length - 1];
    const chat: Chat = {
      id: chatId,
      participants: [user1.uid, user2.uid],
      lastMessage,
      createdAt: chatCreatedAt,
      updatedAt: lastMessage.createdAt,
    };

    await firestore.collection("chats").doc(chatId).set(chat);

    // Write messages to subcollection
    const batch = firestore.batch();
    messages.forEach((msg) => {
      const msgRef = firestore
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(msg.id);
      batch.set(msgRef, msg);
    });
    await batch.commit();
  }

  console.log(`✅ Created ${TARGET_ONE_ON_ONE_CHATS} one-on-one chats`);
}

// ============================================================================
// Group Creation
// ============================================================================

async function createGroups(users: User[]): Promise<void> {
  console.log(`\n👥 Creating ${TARGET_GROUPS} groups...`);

  const firestore = admin.firestore();

  for (let i = 0; i < TARGET_GROUPS; i++) {
    const groupName =
      faker.company.buzzNoun() +
      " " +
      faker.word.noun({ length: { min: 5, max: 8 } });
    const memberCount = randomInt(4, 8);
    const members = randomElements(users, memberCount);
    const admin = randomElement(members);

    const groupId = generateId("group");
    const messageCount = randomInt(
      MESSAGES_PER_GROUP_MIN,
      MESSAGES_PER_GROUP_MAX
    );
    const groupCreatedAt = getRandomTimestamp(DAYS_AGO_MAX);

    // Generate group messages
    const messages = await createMessages(
      groupId,
      members,
      messageCount,
      groupCreatedAt,
      true
    );

    // Create group document
    const lastMessage = messages[messages.length - 1];
    const group: Group = {
      id: groupId,
      name: groupName,
      members: members.map((m) => m.uid),
      admins: [admin.uid],
      lastMessage,
      createdAt: groupCreatedAt,
      updatedAt: lastMessage.createdAt,
    };

    await firestore.collection("groups").doc(groupId).set(group);

    // Write messages to subcollection
    const batch = firestore.batch();
    messages.forEach((msg) => {
      const msgRef = firestore
        .collection("groups")
        .doc(groupId)
        .collection("messages")
        .doc(msg.id);
      batch.set(msgRef, msg);
    });
    await batch.commit();
  }

  console.log(`✅ Created ${TARGET_GROUPS} groups`);
}

// ============================================================================
// Message Creation
// ============================================================================

async function createMessages(
  chatId: string,
  participants: User[],
  count: number,
  startTime: number,
  isGroup: boolean
): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [];
  const timespan = Date.now() - startTime;
  const timeStep = timespan / count;

  for (let i = 0; i < count; i++) {
    const sender = randomElement(participants);
    const hasImage = Math.random() < IMAGE_PROBABILITY;
    const messageTime =
      startTime + i * timeStep + randomInt(-timeStep / 2, timeStep / 2);

    const message: ChatMessage = {
      id: generateId("msg"),
      chatId,
      senderId: sender.uid,
      text: hasImage ? generateRealisticMessage() : generateRealisticMessage(),
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

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log("🚀 Starting data generation for Firebase Emulators...\n");
  console.log("📊 Target data:");
  console.log(`   - Users: ${FIRST_NAMES.length}`);
  console.log(`   - One-on-one chats: ${TARGET_ONE_ON_ONE_CHATS}`);
  console.log(`   - Groups: ${TARGET_GROUPS}`);
  console.log(
    `   - Messages per chat: ${MESSAGES_PER_CHAT_MIN}-${MESSAGES_PER_CHAT_MAX}`
  );
  console.log(
    `   - Messages per group: ${MESSAGES_PER_GROUP_MIN}-${MESSAGES_PER_GROUP_MAX}`
  );
  console.log(`   - Image probability: ${IMAGE_PROBABILITY * 100}%\n`);

  try {
    // Initialize Firebase Admin SDK
    await initializeAdmin();

    // Create users
    const users = await createUsers();

    if (users.length < 2) {
      console.error("❌ Not enough users created. Exiting.");
      process.exit(1);
    }

    // Create one-on-one chats
    await createOneOnOneChats(users);

    // Create groups
    await createGroups(users);

    console.log("\n🎉 Data generation completed successfully!");
    console.log("\n📝 Test user credentials:");
    console.log(
      "   Email: <firstname>@<firstname>.com (e.g., alice@alice.com)"
    );
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    console.log("\n💡 You can now use these accounts to test the app!");
  } catch (error) {
    console.error("\n❌ Error during data generation:", error);
    process.exit(1);
  }
}

// Run the script
main();
