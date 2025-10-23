import database from '@react-native-firebase/database';
import { rtdb } from '@/firebase/firebaseApp';
import { useAuthStore } from '@/store/auth';

interface TypingState {
  isTyping: boolean;
  typingUsers: Set<string>;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

class TypingManager {
  private state: TypingState = {
    isTyping: false,
    typingUsers: new Set(),
    debounceTimer: null,
  };

  private chatId: string | null = null;
  private unsubscribeCallbacks: (() => void)[] = [];

  setChatId(chatId: string) {
    // If already set to this chat, don't set up duplicate listeners
    if (this.chatId === chatId) {
      return;
    }

    // Clean up old listeners before setting up new ones
    this.cleanup();

    this.chatId = chatId;
    this.setupTypingListener();
  }

  private setupTypingListener() {
    if (!this.chatId) return;

    const { user } = useAuthStore.getState();
    if (!user) return;

    // Listen for typing indicators from other users
    const typingRef = rtdb().ref(`typing/${this.chatId}`);

    const callback = (snapshot: any) => {
      try {
        const data = snapshot.val();
        const typingUsers = new Set<string>();

        if (data) {
          Object.keys(data).forEach(uid => {
            if (uid !== user.uid && data[uid] === true) {
              typingUsers.add(uid);
            }
          });
        }

        this.state.typingUsers = typingUsers;
        this.notifyListeners();
      } catch (error) {
        console.error('[TypingManager] Error in callback:', error);
      }
    };

    const unsubscribe = typingRef.on('value', callback, error => {
      console.error('[TypingManager] onValue ERROR:', error);
    });
    this.unsubscribeCallbacks.push(() => typingRef.off('value', callback));
  }

  private notifyListeners() {
    // This would typically trigger a state update in a store
    // For now, we'll use a simple callback system
    if (this.onTypingChange) {
      this.onTypingChange(Array.from(this.state.typingUsers));
    }
  }

  private onTypingChange: ((users: string[]) => void) | null = null;

  setTypingChangeCallback(callback: (users: string[]) => void) {
    this.onTypingChange = callback;
  }

  startTyping() {
    if (!this.chatId) return;

    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      // Clear existing timer
      if (this.state.debounceTimer) {
        clearTimeout(this.state.debounceTimer);
      }

      // Set typing to true
      const typingRef = rtdb().ref(`typing/${this.chatId}/${user.uid}`);
      typingRef.set(true).catch(error => {
        console.error('[TypingManager] Error setting typing in RTDB:', error);
      });

      this.state.isTyping = true;

      // Set timer to stop typing after 2 seconds of inactivity
      this.state.debounceTimer = setTimeout(() => {
        this.stopTyping();
      }, 2000);
    } catch (error) {
      console.error('Error starting typing:', error);
    }
  }

  stopTyping() {
    if (!this.chatId) return;

    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      // Clear timer
      if (this.state.debounceTimer) {
        clearTimeout(this.state.debounceTimer);
        this.state.debounceTimer = null;
      }

      // Remove typing indicator
      const typingRef = rtdb().ref(`typing/${this.chatId}/${user.uid}`);
      typingRef.remove();

      this.state.isTyping = false;
    } catch (error) {
      console.error('Error stopping typing:', error);
    }
  }

  getTypingUsers(): string[] {
    return Array.from(this.state.typingUsers);
  }

  isUserTyping(userId: string): boolean {
    return this.state.typingUsers.has(userId);
  }

  cleanup() {
    // Stop typing if currently typing
    if (this.state.isTyping) {
      this.stopTyping();
    }

    // Clear timer
    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer);
      this.state.debounceTimer = null;
    }

    // Unsubscribe from all listeners
    this.unsubscribeCallbacks.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('[TypingManager] Error unsubscribing:', error);
      }
    });
    this.unsubscribeCallbacks = [];

    // Reset state (but keep callback for reuse)
    this.state = {
      isTyping: false,
      typingUsers: new Set(),
      debounceTimer: null,
    };
  }
}

// Export singleton instance
export const typingManager = new TypingManager();
