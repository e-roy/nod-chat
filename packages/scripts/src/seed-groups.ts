import * as admin from "firebase-admin";
import { EMULATOR_CONFIG, FIREBASE_PROJECT_ID, USE_AI } from "./config";
import { initializeGenkit } from "./ai/genkit";
import { createGroups } from "./generators/groups";
import { User } from "@chatapp/shared";

/**
 * Initialize Firebase Admin SDK for emulator
 */
async function initializeAdmin(): Promise<void> {
  console.log("🔧 Initializing Firebase Admin SDK for emulators...");

  // Initialize with minimal config for emulators
  admin.initializeApp({
    projectId: FIREBASE_PROJECT_ID,
  });

  // Point to emulators
  process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_CONFIG.host}:${EMULATOR_CONFIG.firestorePort}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_CONFIG.host}:${EMULATOR_CONFIG.authPort}`;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${EMULATOR_CONFIG.host}:${EMULATOR_CONFIG.storagePort}`;
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = `${EMULATOR_CONFIG.host}:${EMULATOR_CONFIG.databasePort}`;

  console.log(
    `✅ Connected to Firebase Emulators (Project: ${FIREBASE_PROJECT_ID})`
  );

  // Initialize Genkit AI if enabled
  if (USE_AI) {
    console.log("🤖 AI Mode enabled - using Gemini for message generation");
    initializeGenkit();
  } else {
    console.log("📝 Using template-based message generation");
  }
}

/**
 * Fetch existing users from Firestore
 */
async function fetchExistingUsers(): Promise<User[]> {
  const firestore = admin.firestore();
  const usersSnapshot = await firestore.collection("users").get();

  if (usersSnapshot.empty) {
    throw new Error(
      "No users found in Firestore. Run 'pnpm seed' first to create users."
    );
  }

  return usersSnapshot.docs.map((doc) => doc.data() as User);
}

/**
 * Main function to generate additional groups
 */
async function main(): Promise<void> {
  try {
    console.log("🚀 Adding more group chats to existing users...\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await initializeAdmin();

    // Fetch existing users
    console.log("\n👥 Fetching existing users...");
    const users = await fetchExistingUsers();
    console.log(`✅ Found ${users.length} users`);

    // Create additional groups
    await createGroups(users);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🎉 Additional groups created successfully!");
  } catch (error) {
    console.error("❌ Error during group generation:", error);
    process.exit(1);
  }
}

// Run the script
main();
