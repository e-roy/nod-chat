import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@/types/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseApp';

import { useChatStore, registerFlatListRef } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { usePresenceStore } from '@/store/presence';
import { useThemeStore } from '@/store/theme';
import { useAIStore } from '@/store/ai';
import { getColors } from '@/utils/colors';
import { ChatMessage, User } from '@chatapp/shared';
import MessageInput from '@/components/MessageInput';
import MessageItem from '@/components/MessageItem';
import { ConnectionBanner } from '@/components/ConnectionBanner';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const { chatId, participantName } = route.params;
  const { user } = useAuthStore();
  const {
    messages,
    sendMessage,
    loadMessages,
    setCurrentChat,
    retryMessage,
    // TODO: Re-enable when typing indicators work
    // typingUsers,
    // startTyping,
    // stopTyping,
  } = useChatStore();
  const { userPresence } = usePresenceStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();
  const { loadChatAI, loadPriorities, loadCalendar, unsubscribeFromChat } =
    useAIStore();

  const [messageText, setMessageText] = useState('');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [userCache, setUserCache] = useState<Map<string, User>>(new Map());
  const flatListRef = useRef<FlatList>(null);

  // Register the FlatList ref for scroll-to-message functionality
  useEffect(() => {
    registerFlatListRef(chatId, flatListRef);
    return () => {
      // Cleanup on unmount - optional
    };
  }, [chatId]);

  const chatMessages = messages.get(chatId) || [];

  // Load participant user data
  useEffect(() => {
    const loadParticipantData = async () => {
      if (!user) return;

      // Get all unique sender IDs from messages
      const senderIds = Array.from(
        new Set(chatMessages.map(msg => msg.senderId))
      ).filter(id => id !== user.uid);

      // Load user data for senders not in cache
      const userIdsToLoad = senderIds.filter(id => !userCache.has(id));
      if (userIdsToLoad.length === 0) return;

      try {
        const newUserCache = new Map(userCache);
        for (const userId of userIdsToLoad) {
          const userRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            newUserCache.set(userId, userData);
          }
        }
        setUserCache(newUserCache);
      } catch (error) {
        console.error('Error loading participant data:', error);
      }
    };

    loadParticipantData();
  }, [chatMessages, user, userCache]);

  useEffect(() => {
    setCurrentChat(chatId);
    loadMessages(chatId);

    // Load cached AI data and initialize listeners
    loadChatAI(chatId);
    loadPriorities(chatId);
    loadCalendar(chatId);

    // Mark existing messages as read immediately since user is viewing the chat
    const initialReadTimeout = setTimeout(() => {
      const { markMessagesAsRead } = useChatStore.getState();
      markMessagesAsRead(chatId);
    }, 500); // Small delay to ensure messages are loaded

    return () => {
      clearTimeout(initialReadTimeout);
      // Cleanup AI listeners
      unsubscribeFromChat(chatId);
    };
  }, [
    chatId,
    setCurrentChat,
    loadMessages,
    loadChatAI,
    loadPriorities,
    loadCalendar,
    unsubscribeFromChat,
  ]);

  // Only auto-scroll to bottom when the component first loads with messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, []); // Only run on mount - empty dependency array

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const text = messageText.trim();
    setMessageText('');
    // stopTyping(); // TODO: Re-enable when typing indicators work

    try {
      await sendMessage(chatId, text);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);
    // TODO: Re-enable typing indicators later
    // if (text.trim()) {
    //   startTyping();
    // } else {
    //   stopTyping();
    // }
  };

  const handleImageUpload = async (imageUrl: string) => {
    try {
      await sendMessage(chatId, '', imageUrl);
    } catch (error) {
      console.error('Error sending image message:', error);
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    try {
      await retryMessage(messageId);
    } catch (error) {
      console.error('Error retrying message:', error);
    }
  };

  const renderMessage = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }) => {
    const isOwnMessage = item.senderId === user?.uid;

    // Check if we should show avatar (first message or different sender than previous)
    const prevMessage = index > 0 ? chatMessages[index - 1] : null;
    const showAvatar = !prevMessage || prevMessage.senderId !== item.senderId;

    // Get sender name and photo URL
    let senderName = 'Unknown';
    let senderPhotoURL: string | undefined;

    if (isOwnMessage) {
      senderName = 'You';
      senderPhotoURL = user?.photoURL;
    } else {
      const cachedUser = userCache.get(item.senderId);
      if (cachedUser) {
        senderName =
          cachedUser.displayName ||
          cachedUser.email?.split('@')[0] ||
          participantName ||
          'Unknown';
        senderPhotoURL = cachedUser.photoURL;
      } else {
        senderName = participantName || 'Unknown';
      }
    }

    const isOnline = !isOwnMessage
      ? userPresence.get(item.senderId)?.online || false
      : userPresence.get(user?.uid || '')?.online || false;

    return (
      <MessageItem
        message={item}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar}
        senderName={senderName}
        senderPhotoURL={senderPhotoURL}
        isOnline={isOnline}
        onImagePress={setFullScreenImage}
        onRetry={handleRetryMessage}
      />
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      edges={['left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 10}
      >
        {/* Connection Status Banner */}
        <ConnectionBanner />

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          style={[styles.container, { backgroundColor: colors.bg.primary }]}
          contentContainerStyle={{ paddingVertical: 12 }}
          // onContentSizeChange removed to prevent auto-scroll to bottom
        />

        {/* Message Input */}
        <MessageInput
          chatId={chatId}
          messageText={messageText}
          onMessageTextChange={handleTextChange}
          onSendMessage={handleSendMessage}
          onImageUpload={handleImageUpload}
        />
      </KeyboardAvoidingView>

      {/* Full-Screen Image Viewer */}
      <Modal
        visible={!!fullScreenImage}
        transparent
        onRequestClose={() => setFullScreenImage(null)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => setFullScreenImage(null)}
        >
          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={{ width: '90%', height: '70%' }}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ChatScreen;
