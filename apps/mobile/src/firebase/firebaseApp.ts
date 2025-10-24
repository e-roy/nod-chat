import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import database from '@react-native-firebase/database';

// Check if we're in development mode
const isDevelopment = __DEV__;

// Add a flag to track emulator connection status
let emulatorsConnected = false;

// For development mode, we need to connect to emulators BEFORE any operations
if (isDevelopment) {
  try {
    // For Expo, we need to use the development machine's IP address
    let emulatorHost = process.env.EXPO_PUBLIC_EMULATOR_HOST;

    if (!emulatorHost) {
      // Use your local network IP for better reliability
      emulatorHost = '10.1.10.90';
    }

    const authEmulatorUrl = `http://${emulatorHost}:9099`;
    const firestoreHost = emulatorHost;
    const firestorePort = 8080;
    const databaseHost = emulatorHost;
    const databasePort = 9000;

    // Connect Auth emulator
    auth().useEmulator(authEmulatorUrl);

    // Connect Firestore emulator
    firestore().useEmulator(firestoreHost, firestorePort);

    // Connect Realtime Database emulator
    database().useEmulator(databaseHost, databasePort);

    emulatorsConnected = true;
  } catch (error) {
    console.error('Could not connect to Firebase emulators:', error);
    console.error('Make sure emulators are running with: yarn emulators');
  }
}

// Export emulator status for debugging
export const isEmulatorConnected = () => emulatorsConnected;

export { auth, firestore as db, storage, database as rtdb };
