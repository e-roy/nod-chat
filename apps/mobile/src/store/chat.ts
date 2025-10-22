import { create } from 'zustand';
import { ChatMessage, Chat } from '@chatapp/shared';
import {
  FirebaseTransport,
  generateChatId,
  generateMessageId,
} from '../messaging/firebaseTransport';
import { useAuthStore } from './auth';
import { usePresenceStore } from './presence';
import { typingManager } from '../messaging/typing';

interface ChatState {
  chats: Chat[];
  messages: Map<string, ChatMessage[]>; // chatId -> messages
  currentChatId: string | null;
  transport: FirebaseTransport | null;
  loading: boolean;
  error: string | null;
  chatListenerActive: boolean;
  chatListenerUnsubscribe: (() => void) | null;
  typingUsers: Map<string, string[]>; // chatId -> array of typing user IDs
}

interface ChatActions {
  initializeTransport: () => void;
  setCurrentChat: (chatId: string | null) => void;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  createChat: (participantIds: string[]) => Promise<string>;
  clearError: () => void;
  disconnect: () => void;
  markMessagesAsRead: (chatId: string) => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  setTypingUsers: (typingUsers: Map<string, string[]>) => void;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  chats: [],
  messages: new Map(),
  currentChatId: null,
  transport: null,
  loading: false,
  error: null,
  chatListenerActive: false,
  chatListenerUnsubscribe: null,
  typingUsers: new Map(),

  initializeTransport: () => {
    const transport = new FirebaseTransport();
    set({ transport });
  },

  setCurrentChat: (chatId: string | null) => {
    const { currentChatId } = get();

    // Only process if chatId is actually changing
    if (currentChatId === chatId) {
      return;
    }

    // TODO: Re-enable typing indicators later
    // Stop typing in previous chat
    // if (currentChatId) {
    //   typingManager.stopTyping();
    // }

    // Set up typing manager for new chat
    // if (chatId) {
    //   typingManager.setTypingChangeCallback(users => {
    //     const { typingUsers } = get();
    //     const newTypingUsers = new Map(typingUsers);
    //     if (users.length > 0) {
    //       newTypingUsers.set(chatId, users);
    //     } else {
    //       newTypingUsers.delete(chatId);
    //     }
    //     set({ typingUsers: newTypingUsers });
    //   });
    //   typingManager.setChatId(chatId);
    // }

    set({ currentChatId: chatId });
  },

  loadChats: async () => {
    const { transport, chatListenerActive } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) {
      return;
    }

    // Prevent multiple listeners
    if (chatListenerActive) {
      return;
    }

    set({ loading: true, error: null, chatListenerActive: true });

    try {
      // Set up real-time listener for chats
      const unsubscribe = transport.onChatUpdate(user.uid, chats => {
        // Only update if user is still logged in
        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.uid === user.uid) {
          set({ chats });
        }
      });

      // Store the unsubscribe function
      set({ chatListenerUnsubscribe: unsubscribe });
    } catch (error) {
      console.error('Error loading chats:', error);
      set({ error: 'Failed to load chats', chatListenerActive: false });
    } finally {
      set({ loading: false });
    }
  },

  loadMessages: async (chatId: string) => {
    const { transport, messages } = get();

    if (!transport) {
      return;
    }

    try {
      // Load message history
      const messageHistory = await transport.requestHistory(chatId);
      const newMessages = new Map(messages);
      newMessages.set(chatId, messageHistory);
      set({ messages: newMessages });

      // Set up real-time listener for new messages and status updates
      transport.onMessage(chatId, message => {
        // Only process if user is still logged in
        const { user } = useAuthStore.getState();
        if (!user) return;

        const currentMessages = get().messages;
        const chatMessages = currentMessages.get(chatId) || [];

        // Check if message already exists
        const existingIndex = chatMessages.findIndex(m => m.id === message.id);

        if (existingIndex === -1) {
          // New message - add it
          const updatedMessages = new Map(currentMessages);
          updatedMessages.set(chatId, [...chatMessages, message]);
          set({ messages: updatedMessages });

          // If we're currently viewing this chat and the message is from another user
          const { currentChatId } = get();
          if (
            message.senderId !== user.uid &&
            currentChatId === chatId &&
            message.status !== 'read'
          ) {
            // Mark as read immediately since user is actively viewing the chat
            transport
              .updateMessageStatus(chatId, message.id, 'read')
              .catch(() => {
                // Silently fail - will be marked on next periodic check
              });
          }
        } else {
          // Message exists - update it (for status changes)
          const updatedChatMessages = [...chatMessages];
          updatedChatMessages[existingIndex] = {
            ...updatedChatMessages[existingIndex],
            ...message,
          };
          const updatedMessages = new Map(currentMessages);
          updatedMessages.set(chatId, updatedChatMessages);
          set({ messages: updatedMessages });
        }
      });
    } catch (error) {
      console.error('Error loading messages:', error);
      set({ error: 'Failed to load messages' });
    }
  },

  sendMessage: async (chatId: string, text: string) => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) return;

    try {
      const messageId = generateMessageId();
      const message: ChatMessage = {
        id: messageId,
        chatId,
        senderId: user.uid,
        text,
        createdAt: Date.now(),
        status: 'sending',
      };

      // Optimistically add message to local state
      const { messages } = get();
      const chatMessages = messages.get(chatId) || [];
      const newMessages = new Map(messages);
      newMessages.set(chatId, [...chatMessages, message]);
      set({ messages: newMessages });

      // Send to Firebase
      await transport.send(message);

      // Update the optimistic message status to 'sent'
      const updatedMessages = new Map(get().messages);
      const updatedChatMessages = updatedMessages.get(chatId) || [];
      const messageIndex = updatedChatMessages.findIndex(
        m => m.id === messageId
      );
      if (messageIndex !== -1) {
        updatedChatMessages[messageIndex] = {
          ...updatedChatMessages[messageIndex],
          status: 'sent',
        };
        updatedMessages.set(chatId, updatedChatMessages);
        set({ messages: updatedMessages });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      set({ error: 'Failed to send message' });
    }
  },

  createChat: async (participantIds: string[]) => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    if (!transport) {
      console.error('Transport not initialized');
      set({ error: 'Transport not initialized' });
      return '';
    }

    if (!user) {
      console.error('User not authenticated');
      set({ error: 'User not authenticated' });
      return '';
    }

    try {
      // Ensure we don't duplicate the current user in participants
      const uniqueParticipants = [...new Set([...participantIds, user.uid])];
      const chatId = await transport.createChat(uniqueParticipants);
      return chatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      set({ error: 'Failed to create chat' });
      return '';
    }
  },

  clearError: () => {
    set({ error: null });
  },

  disconnect: () => {
    const { transport, chatListenerUnsubscribe } = get();

    // Unsubscribe from chat listener FIRST
    if (chatListenerUnsubscribe) {
      try {
        chatListenerUnsubscribe();
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Clean up transport listeners
    if (transport) {
      transport.disconnect();
    }

    // Clean up typing manager
    typingManager.cleanup();

    // Clean up presence
    const { cleanup, setOffline } = usePresenceStore.getState();
    setOffline();
    cleanup();

    // IMPORTANT: Reset ALL state to prevent data leakage between users
    set({
      chats: [],
      messages: new Map(),
      currentChatId: null,
      transport: null,
      chatListenerActive: false,
      chatListenerUnsubscribe: null,
      typingUsers: new Map(),
      loading: false,
      error: null,
    });
  },

  markMessagesAsRead: async (chatId: string) => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) return;

    try {
      await transport.markMessagesAsRead(chatId, user.uid);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      set({ error: 'Failed to mark messages as read' });
    }
  },

  startTyping: () => {
    // TODO: Re-enable typing indicators later
    // typingManager.startTyping();
  },

  stopTyping: () => {
    // TODO: Re-enable typing indicators later
    // typingManager.stopTyping();
  },

  setTypingUsers: (typingUsers: Map<string, string[]>) => {
    set({ typingUsers });
  },
}));
