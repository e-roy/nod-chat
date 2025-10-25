import * as admin from "firebase-admin";
import { faker } from "@faker-js/faker";
import { User } from "@chatapp/shared";
import { NUM_USERS, DEFAULT_PASSWORD } from "../config";
import { generateProfilePicture } from "../utils/helpers";

/**
 * Create test users in Firebase Auth and Firestore
 */
export async function createUsers(): Promise<User[]> {
  console.log("\n👥 Creating users...");

  const auth = admin.auth();
  const firestore = admin.firestore();
  const users: User[] = [];

  for (let i = 0; i < NUM_USERS; i++) {
    // Generate random name using Faker (reject titles)
    let fullName = faker.person.fullName();
    while (
      fullName.startsWith("Dr.") ||
      fullName.startsWith("Ms.") ||
      fullName.startsWith("Mr.")
    ) {
      fullName = faker.person.fullName();
    }

    const firstName = fullName.split(" ")[0]; // Extract first name from full name
    const email = `${firstName.toLowerCase()}@${firstName.toLowerCase()}.com`;
    const photoURL = generateProfilePicture(i); // Use index as seed for consistent avatars

    try {
      // Create auth user
      const userRecord = await auth.createUser({
        email,
        password: DEFAULT_PASSWORD,
        displayName: fullName,
        photoURL,
      });

      // Create user document in Firestore
      const user: User = {
        uid: userRecord.uid,
        email,
        displayName: fullName,
        photoURL,
        online: false,
        createdAt: Date.now(),
      };

      await firestore.collection("users").doc(userRecord.uid).set(user);
      users.push(user);
    } catch (error) {
      console.error(`   ✗ Failed to create user ${fullName}:`, error);
    }
  }

  console.log(`✅ Created ${users.length} users`);
  return users;
}
