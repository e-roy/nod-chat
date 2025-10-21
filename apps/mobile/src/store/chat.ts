import { create } from 'zustand';
import { ChatMessage, Chat } from '@chatapp/shared';
import {
  FirebaseTransport,
  generateChatId,
  generateMessageId,
} from '../messaging/firebaseTransport';
import { useAuthStore } from './auth';

interface ChatState {
  chats: Chat[];
  messages: Map<string, ChatMessage[]>; // chatId -> messages
  currentChatId: string | null;
  transport: FirebaseTransport | null;
  loading: boolean;
  error: string | null;
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
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  chats: [],
  messages: new Map(),
  currentChatId: null,
  transport: null,
  loading: false,
  error: null,

  initializeTransport: () => {
    const transport = new FirebaseTransport();
    set({ transport });
  },

  setCurrentChat: (chatId: string | null) => {
    set({ currentChatId: chatId });
  },

  loadChats: async () => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) return;

    set({ loading: true, error: null });

    try {
      // Set up real-time listener for chats
      transport.onChatUpdate(user.uid, chats => {
        set({ chats });
      });
    } catch (error) {
      console.error('Error loading chats:', error);
      set({ error: 'Failed to load chats' });
    } finally {
      set({ loading: false });
    }
  },

  loadMessages: async (chatId: string) => {
    const { transport, messages } = get();

    if (!transport) return;

    try {
      // Load message history
      const messageHistory = await transport.requestHistory(chatId);
      const newMessages = new Map(messages);
      newMessages.set(chatId, messageHistory);
      set({ messages: newMessages });

      // Set up real-time listener for new messages
      transport.onMessage(chatId, message => {
        const currentMessages = get().messages;
        const chatMessages = currentMessages.get(chatId) || [];

        // Check if message already exists to avoid duplicates
        const exists = chatMessages.some(m => m.id === message.id);
        if (!exists) {
          const updatedMessages = new Map(currentMessages);
          updatedMessages.set(chatId, [...chatMessages, message]);
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
    } catch (error) {
      console.error('Error sending message:', error);
      set({ error: 'Failed to send message' });
    }
  },

  createChat: async (participantIds: string[]) => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    console.log('createChat called with:', { participantIds, user: user?.uid });

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
      const allParticipants = [...participantIds, user.uid];
      console.log('Creating chat with participants:', allParticipants);
      const chatId = await transport.createChat(allParticipants);
      console.log('Chat created with ID:', chatId);
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
    const { transport } = get();
    if (transport) {
      transport.disconnect();
    }
    set({
      chats: [],
      messages: new Map(),
      currentChatId: null,
      transport: null,
    });
  },
}));
