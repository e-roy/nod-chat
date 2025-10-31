import { create } from 'zustand';
import { ChatMessage, Chat } from '@chatapp/shared';
import {
  FirebaseTransport,
  generateMessageId,
} from '@/messaging/firebaseTransport';
import { useAuthStore } from './auth';
import { usePresenceStore } from './presence';
import { typingManager } from '@/messaging/typing';
import { useNetworkStore } from './network';
import { useOutboxStore } from './outbox';

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
  highlightedMessageId: string | null;
  highlightType: 'calendar' | 'priority-high' | 'priority-urgent' | null;
}

interface ChatActions {
  initializeTransport: () => void;
  setCurrentChat: (chatId: string | null) => void;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  sendMessage: (
    chatId: string,
    text: string,
    imageUrl?: string
  ) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  createChat: (participantIds: string[]) => Promise<string>;
  clearError: () => void;
  disconnect: () => void;
  markMessagesAsRead: (chatId: string) => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  setTypingUsers: (typingUsers: Map<string, string[]>) => void;
  scrollToMessage: (
    chatId: string,
    messageId: string,
    type?: 'calendar' | 'priority-high' | 'priority-urgent'
  ) => Promise<void>;
  clearHighlight: () => void;
}

import { FlatList } from 'react-native';

type FlatListRef =
  | React.RefObject<FlatList<unknown>>
  | React.RefObject<FlatList<unknown> | null>;

// Store for FlatList refs - we'll use this to access the refs from anywhere
const flatListRefs = new Map<string, FlatListRef>();

export const registerFlatListRef = (chatId: string, ref: FlatListRef) => {
  flatListRefs.set(chatId, ref);
};

export const scrollToMessageById = async (
  chatId: string,
  messageId: string
) => {
  const ref = flatListRefs.get(chatId);
  if (!ref?.current) {
    return;
  }

  // Get messages for this chat from the store
  const state = useChatStore.getState();
  const messages = state.messages.get(chatId) || [];

  if (messages.length === 0) {
    return;
  }

  // Find the message index
  const index = messages.findIndex((msg: ChatMessage) => msg.id === messageId);
  if (index === -1) {
    return;
  }

  try {
    // Try scrollToIndex first
    ref.current.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5,
    });
  } catch (error) {
    // Fallback: scroll to an estimated position
    // Estimate ~100px per message
    const estimatedOffset = index * 100;
    ref.current.scrollToOffset({
      offset: estimatedOffset,
      animated: true,
    });
  }
};

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
  highlightedMessageId: null,
  highlightType: null,

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
          // New message - add it and sort by createdAt to maintain chronological order
          const updatedChatMessages = [...chatMessages, message];
          updatedChatMessages.sort((a, b) => a.createdAt - b.createdAt);
          const updatedMessages = new Map(currentMessages);
          updatedMessages.set(chatId, updatedChatMessages);
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

          // If this is our own message and it's now sent, remove from outbox
          if (message.senderId === user.uid && message.status === 'sent') {
            useOutboxStore.getState().removeFromOutbox(message.id);
          }
        }
      });
    } catch (error) {
      console.error('Error loading messages:', error);
      set({ error: 'Failed to load messages' });
    }
  },

  sendMessage: async (chatId: string, text: string, imageUrl?: string) => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) {
      return;
    }

    const messageId = generateMessageId();
    const isGroupMessage = chatId.startsWith('group_');

    const message: ChatMessage = {
      id: messageId,
      chatId,
      senderId: user.uid,
      text,
      imageUrl: imageUrl || null,
      createdAt: Date.now(),
      status: 'sending',
      // For group messages, initialize readBy as empty (will be populated when others read it)
      readBy: isGroupMessage ? [] : undefined,
    };

    // Optimistically add message to local state and sort to maintain chronological order
    const { messages } = get();
    const chatMessages = messages.get(chatId) || [];
    const updatedChatMessages = [...chatMessages, message];
    updatedChatMessages.sort((a, b) => a.createdAt - b.createdAt);
    const newMessages = new Map(messages);
    newMessages.set(chatId, updatedChatMessages);
    set({ messages: newMessages });

    // Check network status
    const isOnline = useNetworkStore.getState().isOnline();

    if (!isOnline) {
      // Add to outbox for later retry
      await useOutboxStore.getState().addToOutbox(message);
      console.log('Offline: Message queued for sending when online');
      return;
    }

    // Try to send
    try {
      await transport.send(message);
      // Note: Status will be updated via the real-time listener
    } catch (error) {
      console.error('Error sending message:', error);
      // Add to outbox for retry
      await useOutboxStore.getState().addToOutbox(message);
    }
  },

  retryMessage: async (messageId: string) => {
    const { transport, messages } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) {
      return;
    }

    // Find the message in our local state
    let message: ChatMessage | undefined;
    let chatId: string | undefined;

    for (const [cId, msgs] of messages.entries()) {
      const found = msgs.find(m => m.id === messageId);
      if (found) {
        message = found;
        chatId = cId;
        break;
      }
    }

    if (!message || !chatId) {
      console.error('Message not found for retry');
      return;
    }

    // Update status to sending
    const chatMessages = messages.get(chatId) || [];
    const messageIndex = chatMessages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      const updatedMessages = [...chatMessages];
      updatedMessages[messageIndex] = { ...message, status: 'sending' };
      const newMessagesMap = new Map(messages);
      newMessagesMap.set(chatId, updatedMessages);
      set({ messages: newMessagesMap });
    }

    // Try to send
    try {
      await transport.send(message);
      // Remove from outbox on success
      await useOutboxStore.getState().removeFromOutbox(messageId);
    } catch (error) {
      console.error('Error retrying message:', error);
      // Keep in outbox for automatic retry
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

    if (!transport || !user) {
      return;
    }

    try {
      const isGroupMessage = chatId.startsWith('group_');
      if (isGroupMessage) {
        // For groups, handle read status directly in the transport
        await transport.updateGroupReadStatus(chatId, user.uid);
      } else {
        // For regular chats, use the existing method
        await transport.markMessagesAsRead(chatId, user.uid);
      }
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

  scrollToMessage: async (
    chatId: string,
    messageId: string,
    type: 'calendar' | 'priority-high' | 'priority-urgent' = 'priority-high'
  ) => {
    // Set the highlighted message and type before scrolling
    set({ highlightedMessageId: messageId, highlightType: type });

    // Scroll to the message
    await scrollToMessageById(chatId, messageId);

    // Auto-clear highlight after 3 seconds
    setTimeout(() => {
      set({ highlightedMessageId: null, highlightType: null });
    }, 3000);
  },

  clearHighlight: () => {
    set({ highlightedMessageId: null, highlightType: null });
  },
}));
