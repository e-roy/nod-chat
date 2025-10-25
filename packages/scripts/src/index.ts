import * as admin from "firebase-admin";
import { EMULATOR_CONFIG, FIREBASE_PROJECT_ID, USE_AI } from "./config";
import { initializeGenkit } from "./ai/genkit";
import { createUsers } from "./generators/users";
import { createChats } from "./generators/chats";
import { createGroups } from "./generators/groups";

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
    console.log(
      "   (Enable AI with: GOOGLE_API_KEY=<key> USE_AI=true pnpm seed)"
    );
  }
}

/**
 * Main function to generate all test data
 */
async function main(): Promise<void> {
  try {
    console.log("🚀 Starting data generation for Firebase emulators...\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await initializeAdmin();

    // Create users first
    const users = await createUsers();

    if (users.length === 0) {
      console.error("❌ No users created. Exiting.");
      return;
    }

    // Create one-on-one chats
    await createChats(users);

    // Create group chats
    await createGroups(users);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🎉 Data generation complete!");
    console.log("\n📊 Summary:");
    console.log(`   • Users: ${users.length}`);
    console.log(`   • One-on-one chats: Generated with realistic messages`);
    console.log(`   • Group chats: Generated with multiple members`);
    console.log(
      "\n✅ You can now start your Expo app and test with the emulator data!"
    );
    console.log("\n💡 All users have the password: 'password'\n");
  } catch (error) {
    console.error("❌ Error during data generation:", error);
    process.exit(1);
  }
}

// Run the script
main();
