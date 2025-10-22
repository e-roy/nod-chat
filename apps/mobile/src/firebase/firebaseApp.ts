import { initializeApp } from 'firebase/app';

import {
  initializeAuth,
  // @ts-ignore
  getReactNativePersistence,
  connectAuthEmulator,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Check if we're in development mode
const isDevelopment = __DEV__;

// Try both methods to get Firebase config
const configFromConstants = Constants.expoConfig?.extra?.firebase;
const configFromEnv = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Use environment variables directly if Constants doesn't work
const firebaseConfig =
  configFromConstants && Object.keys(configFromConstants).length > 0
    ? configFromConstants
    : configFromEnv;

if (!firebaseConfig || !firebaseConfig.apiKey) {
  throw new Error(
    'Firebase configuration not found. Please check your app.config.ts and environment variables.'
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

console.log('🔧 Firebase config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  isDevelopment,
});

// Add a flag to track emulator connection status
let emulatorsConnected = false;

// Initialize Firebase services with explicit persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);
const storage = getStorage(app);

// For development mode, we need to connect to emulators BEFORE any operations
if (isDevelopment) {
  console.log('🔧 Development mode detected, connecting to emulators...');

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
        console.log(`🔧 Using IP from Expo Constants: ${emulatorHost}`);
      } else {
        // Use your local network IP for better reliability
        emulatorHost = '10.1.10.90';
        console.log(`🔧 Using local network IP: ${emulatorHost}`);
      }
    } else {
      console.log(`🔧 Using IP from environment: ${emulatorHost}`);
    }

    const authEmulatorUrl = `http://${emulatorHost}:9099`;
    const firestoreHost = emulatorHost;
    const firestorePort = 8080;

    console.log(`🔧 Connecting to emulators at ${emulatorHost}...`);

    // Connect Auth emulator
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, authEmulatorUrl);
    }
    console.log('✅ Auth emulator connected');

    // Connect Firestore emulator - this is critical to prevent cloud calls
    try {
      connectFirestoreEmulator(db, firestoreHost, firestorePort);
      console.log('✅ Firestore emulator connected');
    } catch (emulatorError: any) {
      if (emulatorError.message?.includes('already been called')) {
        console.log('✅ Firestore emulator already connected');
      } else {
        console.log(
          '⚠️ Firestore emulator connection failed:',
          emulatorError.message
        );
        throw emulatorError;
      }
    }

    emulatorsConnected = true;
    console.log('🔥 All Firebase emulators connected successfully');
  } catch (error) {
    console.log('⚠️ Could not connect to Firebase emulators:', error);
    console.log('Make sure emulators are running with: pnpm emulators');
    console.log(
      "For Expo Go, you may need to set EXPO_PUBLIC_EMULATOR_HOST to your machine's IP address"
    );
  }
} else {
  console.log('🌐 Production mode - using Firebase cloud services');
}

// Export emulator status for debugging
export const isEmulatorConnected = () => emulatorsConnected;

export { auth, db, storage };
export default app;
