import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseApp';
import { User } from '@chatapp/shared';
import {
  initializeNotifications,
  removeFCMToken,
  cleanupNotificationListeners,
} from '@/messaging/notifications';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

// Helper to remove undefined values (Firestore doesn't accept them)
const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
};

const createUserDocument = async (
  firebaseUser: FirebaseUser,
  displayName: string
) => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const userData: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName,
      photoURL: firebaseUser.photoURL || undefined,
      online: false,
      lastSeen: undefined,
      createdAt: Date.now(),
    };
    await setDoc(userRef, removeUndefined(userData));
  }
};

const firebaseUserToUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email!,
  displayName: firebaseUser.displayName || undefined,
  photoURL: firebaseUser.photoURL || undefined,
  online: false,
  lastSeen: undefined,
  createdAt: Date.now(),
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  signUp: async (email: string, password: string, displayName: string) => {
    try {
      set({ loading: true, error: null });
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;
      // Update Firebase Auth profile
      await updateProfile(firebaseUser, { displayName });
      // Create user document in Firestore
      await createUserDocument(firebaseUser, displayName);
      const user = firebaseUserToUser(firebaseUser);
      set({ user, loading: false });

      // Initialize push notifications (don't block on this)
      initializeNotifications(firebaseUser.uid).catch(error => {
        console.warn('Failed to initialize notifications:', error);
      });
    } catch (error: any) {
      // Extract Firebase error code from the error object
      const errorCode = error.code || error.message;
      set({ error: errorCode, loading: false });
      // Don't throw the error - let the UI handle it via the error state
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;
      // Get user document from Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      let user: User;
      if (userSnap.exists()) {
        user = userSnap.data() as User;
      } else {
        // Create user document if it doesn't exist
        await createUserDocument(firebaseUser, firebaseUser.displayName || '');
        user = firebaseUserToUser(firebaseUser);
      }
      set({ user, loading: false });

      // Initialize push notifications (don't block on this)
      initializeNotifications(firebaseUser.uid).catch(error => {
        console.warn('Failed to initialize notifications:', error);
      });
    } catch (error: any) {
      // Extract Firebase error code from the error object
      const errorCode = error.code || error.message;
      set({ error: errorCode, loading: false });
      // Don't throw the error - let the UI handle it via the error state
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });

      const { user } = get();

      // CRITICAL: Clean up ALL listeners BEFORE signing out to prevent permission errors
      const { useChatStore } = await import('./chat');
      const { usePresenceStore } = await import('./presence');

      // Clean up notification listeners
      cleanupNotificationListeners();

      // Remove FCM token from Firestore (don't block on this)
      if (user?.uid) {
        removeFCMToken(user.uid).catch(error => {
          console.warn('Failed to remove FCM token:', error);
        });
      }

      // Disconnect chat (which also cleans up presence)
      useChatStore.getState().disconnect();

      // Extra cleanup to ensure presence listeners are gone
      usePresenceStore.getState().cleanup();

      // Small delay to ensure all cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100));

      await signOut(auth);
      set({ user: null, loading: false });
    } catch (error: any) {
      // Extract Firebase error code from the error object
      const errorCode = error.code || error.message;
      set({ error: errorCode, loading: false });
      // Don't throw the error - let the UI handle it via the error state
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    try {
      const { user } = get();
      if (!user) throw new Error('No user logged in');
      set({ loading: true, error: null });
      // Update Firestore document - remove undefined values
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, removeUndefined(updates), { merge: true });
      // Update Firebase Auth profile if needed
      if (updates.displayName || updates.photoURL) {
        const authUpdates = removeUndefined({
          displayName: updates.displayName,
          photoURL: updates.photoURL,
        });
        await updateProfile(auth.currentUser!, authUpdates);
      }
      set({ user: { ...user, ...updates }, loading: false });
    } catch (error: any) {
      // Extract Firebase error code from the error object
      const errorCode = error.code || error.message;
      set({ error: errorCode, loading: false });
      // Don't throw the error - let the UI handle it via the error state
    }
  },

  clearError: () => set({ error: null }),
}));

// Listen to auth state changes
onAuthStateChanged(auth, async firebaseUser => {
  if (firebaseUser) {
    try {
      // Get user document from Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      let user: User;
      if (userSnap.exists()) {
        user = userSnap.data() as User;
      } else {
        // Create user document if it doesn't exist
        await createUserDocument(firebaseUser, firebaseUser.displayName || '');
        user = firebaseUserToUser(firebaseUser);
      }

      useAuthStore.setState({ user, loading: false });

      // Initialize push notifications for persistent logins (don't block on this)
      initializeNotifications(firebaseUser.uid).catch(error => {
        console.warn('Failed to initialize notifications:', error);
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      useAuthStore.setState({ loading: false });
    }
  } else {
    // User signed out - clean up all listeners immediately
    try {
      cleanupNotificationListeners();
      const { useChatStore } = await import('./chat');
      const chatStore = useChatStore.getState();
      if (chatStore.transport) {
        chatStore.disconnect();
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
    useAuthStore.setState({ user: null, loading: false });
  }
});
