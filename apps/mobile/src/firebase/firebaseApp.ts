import { initializeApp } from 'firebase/app';

import {
  initializeAuth,
  // @ts-ignore
  getReactNativePersistence,
  connectAuthEmulator,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import Constants from 'expo-constants';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Check if we're in development mode
const isDevelopment = __DEV__;

// Firebase configuration - matches app.config.ts
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

// Validate that all required fields are present
const missingFields = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key, _]) => key);

if (missingFields.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingFields.join(', ')}`
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Add a flag to track emulator connection status
let emulatorsConnected = false;

// Initialize Firebase services with explicit persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);

// For development mode, we need to connect to emulators BEFORE any operations
if (isDevelopment) {
  try {
    // For Expo Go, we need to use the development machine's IP address
    // Try to get the IP from Expo Constants first, then fallback to environment variable or default
    let emulatorHost = process.env.EXPO_PUBLIC_EMULATOR_HOST;

    if (!emulatorHost) {
      // Try to get the IP from Expo Constants (works with Expo Go)
      const debuggerHost =
        Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
      if (debuggerHost) {
        emulatorHost = debuggerHost.split(':')[0];
      } else {
        // Use your local network IP for better reliability
        emulatorHost = '10.1.10.90';
      }
    }

    const authEmulatorUrl = `http://${emulatorHost}:9099`;
    const firestoreHost = emulatorHost;
    const firestorePort = 8080;
    const databaseHost = emulatorHost;
    const databasePort = 9000;
    const storageHost = emulatorHost;
    const storagePort = 9199;

    // Connect Auth emulator
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, authEmulatorUrl);
    }

    // Connect Firestore emulator - this is critical to prevent cloud calls
    try {
      connectFirestoreEmulator(db, firestoreHost, firestorePort);
    } catch (emulatorError: any) {
      if (!emulatorError.message?.includes('already been called')) {
        throw emulatorError;
      }
    }

    // Connect Realtime Database emulator
    try {
      connectDatabaseEmulator(rtdb, databaseHost, databasePort);
    } catch (emulatorError: any) {
      if (!emulatorError.message?.includes('already been called')) {
        throw emulatorError;
      }
    }

    // Connect Storage emulator
    try {
      connectStorageEmulator(storage, storageHost, storagePort);
    } catch (emulatorError: any) {
      if (!emulatorError.message?.includes('already been called')) {
        throw emulatorError;
      }
    }

    emulatorsConnected = true;
  } catch (error) {
    console.error('Could not connect to Firebase emulators:', error);
    console.error('Make sure emulators are running with: pnpm emulators');
  }
}

// Export emulator status for debugging
export const isEmulatorConnected = () => emulatorsConnected;

export { auth, db, storage, rtdb };
export default app;
