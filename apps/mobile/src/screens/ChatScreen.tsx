import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@/types/navigation';

import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { usePresenceStore } from '@/store/presence';
import { ChatMessage } from '@chatapp/shared';
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

  const [messageText, setMessageText] = useState('');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const chatMessages = messages.get(chatId) || [];

  useEffect(() => {
    setCurrentChat(chatId);
    loadMessages(chatId);

    // Mark existing messages as read immediately since user is viewing the chat
    const initialReadTimeout = setTimeout(() => {
      const { markMessagesAsRead } = useChatStore.getState();
      markMessagesAsRead(chatId);
    }, 500); // Small delay to ensure messages are loaded

    return () => {
      clearTimeout(initialReadTimeout);
    };
  }, [chatId, setCurrentChat, loadMessages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages.length]);

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

    // Get sender name and online status
    const senderName = isOwnMessage ? 'You' : participantName || 'Unknown';
    const isOnline = !isOwnMessage
      ? userPresence.get(item.senderId)?.online || false
      : userPresence.get(user?.uid || '')?.online || false;

    return (
      <MessageItem
        message={item}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar}
        senderName={senderName}
        isOnline={isOnline}
        onImagePress={setFullScreenImage}
        onRetry={handleRetryMessage}
      />
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={['top']}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Connection Status Banner */}
        <ConnectionBanner />

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          className="flex-1 bg-white dark:bg-neutral-900"
          contentContainerStyle={{ paddingVertical: 12 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
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

export default ChatScreen;
