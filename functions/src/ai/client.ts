import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import * as dotenv from "dotenv";

// Load environment variables from .env.local if it exists
dotenv.config({ path: ".env.local" });

let ai: any = null;

/**
 * Initialize Firebase Genkit with Google AI
 */
export function initializeGenkit(): void {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn("⚠️  GOOGLE_API_KEY not set. AI features disabled.");
    return;
  }

  try {
    ai = genkit({
      plugins: [
        googleAI({
          apiKey,
        }),
      ],
    });
    console.log("✅ Firebase Genkit initialized with Google AI");
  } catch (error) {
    console.error("❌ Failed to initialize Genkit:", error);
  }
}

/**
 * Get the AI client instance
 */
export function getAI() {
  if (!ai) {
    initializeGenkit();
  }
  return ai;
}

/**
 * Check if AI is available
 */
export function isAIAvailable(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}
