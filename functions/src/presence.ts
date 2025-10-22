import {
  onValueCreated,
  onValueUpdated,
  onValueDeleted,
} from "firebase-functions/v2/database";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

// Mirror presence from RTDB to Firestore
export const mirrorPresenceToFirestore = onValueCreated(
  { ref: "/status/{uid}" },
  async (event) => {
    const uid = event.params.uid;
    const presenceData = event.data.val();

    logger.info(
      `🔥 FUNCTION TRIGGERED: mirrorPresenceToFirestore for user ${uid}`,
      {
        presenceData,
        eventType: "created",
      }
    );

    try {
      await db
        .collection("users")
        .doc(uid)
        .set(
          {
            online: presenceData.state === "online",
            lastSeen: presenceData.lastChanged,
            updatedAt: new Date(),
          },
          { merge: true }
        );

      logger.info(`✅ SUCCESS: Mirrored presence for user ${uid}`, {
        online: presenceData.state === "online",
        lastSeen: presenceData.lastChanged,
      });
    } catch (error) {
      logger.error(
        `❌ ERROR: Failed to mirror presence for user ${uid}:`,
        error
      );
    }
  }
);

export const updatePresenceInFirestore = onValueUpdated(
  { ref: "/status/{uid}" },
  async (event) => {
    const uid = event.params.uid;
    const presenceData = event.data.after.val();

    logger.info(`Updating presence in Firestore for user ${uid}`, {
      presenceData,
    });

    try {
      await db
        .collection("users")
        .doc(uid)
        .set(
          {
            online: presenceData.state === "online",
            lastSeen: presenceData.lastChanged,
            updatedAt: new Date(),
          },
          { merge: true }
        );

      logger.info(`Successfully updated presence for user ${uid}`);
    } catch (error) {
      logger.error(`Error updating presence for user ${uid}:`, error);
    }
  }
);

export const removePresenceFromFirestore = onValueDeleted(
  { ref: "/status/{uid}" },
  async (event) => {
    const uid = event.params.uid;

    logger.info(`Removing presence from Firestore for user ${uid}`);

    try {
      await db.collection("users").doc(uid).set(
        {
          online: false,
          lastSeen: Date.now(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      logger.info(`Successfully removed presence for user ${uid}`);
    } catch (error) {
      logger.error(`Error removing presence for user ${uid}:`, error);
    }
  }
);
