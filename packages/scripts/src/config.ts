import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// ============================================================================
// Emulator Configuration
// ============================================================================

export const EMULATOR_CONFIG = {
  authPort: 9099,
  firestorePort: 8080,
  storagePort: 9199,
  databasePort: 9000,
  host: "localhost",
} as const;

// ============================================================================
// Data Generation Settings
// ============================================================================

export const NUM_USERS = 20;
export const DEFAULT_PASSWORD = "password";

export const TARGET_ONE_ON_ONE_CHATS = 18;
export const TARGET_GROUPS = 6;

export const MESSAGES_PER_CHAT_MIN = 20;
export const MESSAGES_PER_CHAT_MAX = 50;
export const MESSAGES_PER_GROUP_MIN = 30;
export const MESSAGES_PER_GROUP_MAX = 50;

export const IMAGE_PROBABILITY = 0.2; // 20% of messages have images

export const DAYS_AGO_MIN = 3;
export const DAYS_AGO_MAX = 14;

// ============================================================================
// AI Configuration
// ============================================================================

export const USE_AI = process.env.USE_AI === "true";
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// ============================================================================
// Firebase Configuration
// ============================================================================

export const FIREBASE_PROJECT_ID = "message-ai-b426b";
