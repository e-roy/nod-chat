import { create } from 'zustand';
import database from '@react-native-firebase/database';
import firestore from '@react-native-firebase/firestore';
import { rtdb, db } from '../firebase/firebaseApp';
import { useAuthStore } from './auth';

interface PresenceState {
  isOnline: boolean;
  lastSeen: number | null;
  userPresence: Map<string, { online: boolean; lastSeen: number }>;
  presenceListenerActive: boolean;
  unsubscribeFunctions: Map<string, () => void>;
}

interface PresenceActions {
  setOnline: () => void;
  setOffline: () => void;
  subscribeToUserPresence: (userId: string) => () => void;
  subscribeToAllPresence: (userIds: string[]) => () => void;
  cleanup: () => void;
  debugPresence: (userId: string) => Promise<any>;
}

export const usePresenceStore = create<PresenceState & PresenceActions>(
  (set, get) => ({
    isOnline: false,
    lastSeen: null,
    userPresence: new Map(),
    presenceListenerActive: false,
    unsubscribeFunctions: new Map(),

    setOnline: () => {
      const { user } = useAuthStore.getState();
      if (!user) return;

      try {
        const statusRef = rtdb().ref(`status/${user.uid}`);
        const timestamp = Date.now();

        // Set online status
        statusRef.set({
          state: 'online',
          lastChanged: timestamp,
        });

        // Set up disconnect handler
        statusRef.onDisconnect().set({
          state: 'offline',
          lastChanged: timestamp,
        });

        set({ isOnline: true, lastSeen: timestamp });
      } catch (error) {
        console.error('Error setting online status:', error);
      }
    },

    setOffline: () => {
      const { user } = useAuthStore.getState();
      if (!user) return;

      try {
        const statusRef = rtdb().ref(`status/${user.uid}`);
        const timestamp = Date.now();

        statusRef.set({
          state: 'offline',
          lastChanged: timestamp,
        });

        set({ isOnline: false, lastSeen: timestamp });
      } catch (error) {
        console.error('Error setting offline status:', error);
      }
    },

    subscribeToUserPresence: (userId: string) => {
      // Don't subscribe if already subscribed
      const { unsubscribeFunctions } = get();
      if (unsubscribeFunctions.has(userId)) {
        return unsubscribeFunctions.get(userId)!;
      }

      // Subscribe to Firestore user document (mirrored by Cloud Function)
      const userRef = firestore().collection('users').doc(userId);

      const unsubscribe = userRef.onSnapshot(
        docSnapshot => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            if (data) {
              const { userPresence } = get();
              const newPresence = new Map(userPresence);
              newPresence.set(userId, {
                online: data.online || false,
                lastSeen: data.lastSeen || Date.now(),
              });
              set({ userPresence: newPresence });
            }
          }
        },
        error => {
          console.error('Error subscribing to presence:', error);
        }
      );

      // Store the unsubscribe function
      const newUnsubscribeFunctions = new Map(unsubscribeFunctions);
      newUnsubscribeFunctions.set(userId, unsubscribe);
      set({ unsubscribeFunctions: newUnsubscribeFunctions });

      return unsubscribe;
    },

    subscribeToAllPresence: (userIds: string[]) => {
      const { presenceListenerActive } = get();
      if (presenceListenerActive) {
        return () => {};
      }

      set({ presenceListenerActive: true });
      const unsubscribers: (() => void)[] = [];

      userIds.forEach(userId => {
        const unsubscribe = get().subscribeToUserPresence(userId);
        unsubscribers.push(unsubscribe);
      });

      return () => {
        unsubscribers.forEach(unsubscribe => unsubscribe());
        set({ presenceListenerActive: false });
      };
    },

    cleanup: () => {
      // Unsubscribe from all presence listeners first
      const { unsubscribeFunctions } = get();
      unsubscribeFunctions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          // Ignore errors during cleanup
        }
      });

      // Reset all state
      set({
        isOnline: false,
        lastSeen: null,
        userPresence: new Map(),
        presenceListenerActive: false,
        unsubscribeFunctions: new Map(),
      });
    },

    // Debug function to check RTDB data
    debugPresence: async (userId: string) => {
      try {
        const statusRef = rtdb().ref(`status/${userId}`);
        const snapshot = await statusRef.once('value');
        return snapshot.val();
      } catch (error) {
        console.error('Error debugging presence:', error);
        return null;
      }
    },
  })
);
