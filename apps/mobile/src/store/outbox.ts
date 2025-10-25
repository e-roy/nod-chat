import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '@chatapp/shared';
import { useNetworkStore } from './network';

const OUTBOX_STORAGE_KEY = '@chatapp/outbox';
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY = 1000; // 1 second

interface OutboxItem {
  message: ChatMessage;
  attempts: number;
  nextRetryAt: number;
  chatId: string;
}

interface OutboxState {
  outbox: Map<string, OutboxItem>;
  isProcessing: boolean;
  retryTimers: Map<string, NodeJS.Timeout>;
}

interface OutboxActions {
  addToOutbox: (message: ChatMessage) => Promise<void>;
  removeFromOutbox: (messageId: string) => Promise<void>;
  getOutboxMessages: () => OutboxItem[];
  retryOutbox: () => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  incrementRetryCount: (messageId: string) => Promise<void>;
  loadOutbox: () => Promise<void>;
  clearRetryTimers: () => void;
  scheduleRetry: (messageId: string, delay: number) => void;
}

// Calculate exponential backoff delay
const calculateRetryDelay = (attempts: number): number => {
  const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempts), 32000); // Max 32s
  return delay;
};

export const useOutboxStore = create<OutboxState & OutboxActions>(
  (set, get) => ({
    outbox: new Map(),
    isProcessing: false,
    retryTimers: new Map(),

    addToOutbox: async (message: ChatMessage) => {
      const { outbox } = get();
      const newOutbox = new Map(outbox);

      const outboxItem: OutboxItem = {
        message,
        attempts: 0,
        nextRetryAt: Date.now() + calculateRetryDelay(0),
        chatId: message.chatId,
      };

      newOutbox.set(message.id, outboxItem);
      set({ outbox: newOutbox });

      // Persist to AsyncStorage
      try {
        const serialized = JSON.stringify(Array.from(newOutbox.entries()));
        await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, serialized);
      } catch (error) {
        console.error('Error saving outbox to storage:', error);
      }

      // Schedule retry
      const delay = calculateRetryDelay(0);
      get().scheduleRetry(message.id, delay);
    },

    removeFromOutbox: async (messageId: string) => {
      const { outbox, retryTimers } = get();
      const newOutbox = new Map(outbox);
      newOutbox.delete(messageId);

      // Clear any pending retry timer
      const timer = retryTimers.get(messageId);
      if (timer) {
        clearTimeout(timer);
        const newTimers = new Map(retryTimers);
        newTimers.delete(messageId);
        set({ retryTimers: newTimers });
      }

      set({ outbox: newOutbox });

      // Persist to AsyncStorage
      try {
        if (newOutbox.size === 0) {
          await AsyncStorage.removeItem(OUTBOX_STORAGE_KEY);
        } else {
          const serialized = JSON.stringify(Array.from(newOutbox.entries()));
          await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, serialized);
        }
      } catch (error) {
        console.error('Error updating outbox storage:', error);
      }
    },

    getOutboxMessages: () => {
      const { outbox } = get();
      return Array.from(outbox.values());
    },

    retryOutbox: async () => {
      const { outbox, isProcessing } = get();

      if (isProcessing || outbox.size === 0) {
        return;
      }

      set({ isProcessing: true });

      const items = Array.from(outbox.values());
      for (const item of items) {
        // Only retry if it's time and we haven't exceeded max attempts
        if (
          Date.now() >= item.nextRetryAt &&
          item.attempts < MAX_RETRY_ATTEMPTS
        ) {
          await get().retryMessage(item.message.id);
        }
      }

      set({ isProcessing: false });
    },

    retryMessage: async (messageId: string) => {
      const { outbox } = get();
      const item = outbox.get(messageId);

      if (!item) {
        return;
      }

      // Check if we're online before retrying
      const isOnline = useNetworkStore.getState().isOnline();
      if (!isOnline) {
        return;
      }

      try {
        // Import transport dynamically to avoid circular dependency
        const { useChatStore } = await import('./chat');
        const { transport } = useChatStore.getState();

        if (!transport) {
          console.error('Transport not initialized');
          return;
        }

        // Try to send the message
        await transport.send(item.message);

        // Success! Remove from outbox
        await get().removeFromOutbox(messageId);
      } catch (error) {
        console.error('Error retrying message:', error);

        // Increment retry count
        await get().incrementRetryCount(messageId);
      }
    },

    incrementRetryCount: async (messageId: string) => {
      const { outbox } = get();
      const item = outbox.get(messageId);

      if (!item) {
        return;
      }

      const newAttempts = item.attempts + 1;

      if (newAttempts >= MAX_RETRY_ATTEMPTS) {
        // Mark message as failed
        const updatedMessage = { ...item.message, status: 'failed' as const };
        const { useChatStore } = await import('./chat');
        const { messages } = useChatStore.getState();
        const chatMessages = messages.get(item.chatId) || [];
        const messageIndex = chatMessages.findIndex(m => m.id === messageId);

        if (messageIndex !== -1) {
          const updatedMessages = [...chatMessages];
          updatedMessages[messageIndex] = updatedMessage;
          const newMessagesMap = new Map(messages);
          newMessagesMap.set(item.chatId, updatedMessages);
          useChatStore.setState({ messages: newMessagesMap });
        }

        // Don't remove from outbox yet - user might want to retry manually
        // But stop auto-retrying
        return;
      }

      const updatedItem: OutboxItem = {
        ...item,
        attempts: newAttempts,
        nextRetryAt: Date.now() + calculateRetryDelay(newAttempts),
      };

      const newOutbox = new Map(outbox);
      newOutbox.set(messageId, updatedItem);
      set({ outbox: newOutbox });

      // Persist to AsyncStorage
      try {
        const serialized = JSON.stringify(Array.from(newOutbox.entries()));
        await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, serialized);
      } catch (error) {
        console.error('Error updating outbox storage:', error);
      }

      // Schedule next retry
      const delay = calculateRetryDelay(newAttempts);
      get().scheduleRetry(messageId, delay);
    },

    loadOutbox: async () => {
      try {
        const stored = await AsyncStorage.getItem(OUTBOX_STORAGE_KEY);
        if (stored) {
          const entries: [string, OutboxItem][] = JSON.parse(stored);
          const outbox = new Map(entries);
          set({ outbox });

          // Schedule retries for all items
          entries.forEach(([messageId, item]) => {
            if (item.attempts < MAX_RETRY_ATTEMPTS) {
              const delay = Math.max(0, item.nextRetryAt - Date.now());
              get().scheduleRetry(messageId, delay);
            }
          });
        }
      } catch (error) {
        console.error('Error loading outbox from storage:', error);
      }
    },

    clearRetryTimers: () => {
      const { retryTimers } = get();
      retryTimers.forEach(timer => clearTimeout(timer));
      set({ retryTimers: new Map() });
    },

    scheduleRetry: (messageId: string, delay: number) => {
      const { retryTimers } = get();

      // Clear existing timer if any
      const existingTimer = retryTimers.get(messageId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Schedule new retry
      const timer = setTimeout(() => {
        get().retryMessage(messageId);
      }, delay);

      const newTimers = new Map(retryTimers);
      newTimers.set(messageId, timer);
      set({ retryTimers: newTimers });
    },
  })
);

// Subscribe to network changes to retry on reconnection
let previousOnlineState = false;

// Subscribe to network store instead of directly to NetInfo
useNetworkStore.subscribe(state => {
  const isOnline = state.isOnline();

  // If we just came online, retry all pending messages
  if (isOnline && !previousOnlineState) {
    console.log('Network reconnected, retrying pending messages...');
    setTimeout(() => {
      useOutboxStore.getState().retryOutbox();
    }, 1000); // Wait 1s for Firebase to reconnect
  }

  previousOnlineState = isOnline;
});

// Load outbox on initialization
useOutboxStore.getState().loadOutbox();
