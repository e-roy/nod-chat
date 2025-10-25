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

import { Avatar, AvatarFallbackText } from '@ui/avatar';
import { Text } from '@ui/text';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { usePresenceStore } from '@/store/presence';
import { ChatMessage } from '@chatapp/shared';
import MessageInput from '@/components/MessageInput';

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
  }, [chatId]);

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

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.senderId === user?.uid;
    const hasImage = !!item.imageUrl;

    return (
      <HStack
        className={`mb-3 px-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
        justifyContent={isOwnMessage ? 'end' : 'start'}
      >
        <VStack
          className={`max-w-[80%] ${isOwnMessage ? 'items-end' : 'items-start'}`}
          alignItems={isOwnMessage ? 'end' : 'start'}
        >
          <Box
            className={`${hasImage ? 'p-1' : 'px-3 py-2'} rounded-2xl ${
              isOwnMessage
                ? 'bg-blue-500 rounded-br-md'
                : 'bg-neutral-200 dark:bg-neutral-700 rounded-bl-md'
            }`}
          >
            {hasImage && (
              <TouchableOpacity
                onPress={() => setFullScreenImage(item.imageUrl!)}
              >
                <Image
                  source={{ uri: item.imageUrl! }}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 12,
                  }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {item.text && (
              <Text
                className={`text-sm ${hasImage ? 'mt-2' : ''} ${
                  isOwnMessage
                    ? 'text-white'
                    : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
                {item.text}
              </Text>
            )}
          </Box>
          <HStack className="items-center mt-1 gap-1" alignItems="center">
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isOwnMessage && (
              <Text
                className={`text-xs ${
                  item.status === 'read'
                    ? 'text-blue-500 font-bold'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {getMessageStatusIcon(item.status || 'sent')}
              </Text>
            )}
          </HStack>
        </VStack>
      </HStack>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <HStack
          className="items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700"
          alignItems="center"
          justifyContent="between"
        >
          <HStack className="items-center gap-3" alignItems="center">
            <Box className="relative">
              <Avatar size="sm">
                <AvatarFallbackText>
                  {participantName?.charAt(0) || 'U'}
                </AvatarFallbackText>
              </Avatar>
              {/* Presence Indicator */}
              {(() => {
                const otherParticipant = chatMessages.find(
                  m => m.senderId !== user?.uid
                )?.senderId;
                const isOnline = otherParticipant
                  ? userPresence.get(otherParticipant)?.online
                  : false;
                return (
                  isOnline && (
                    <Box className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-neutral-50 dark:border-neutral-950" />
                  )
                );
              })()}
            </Box>
            <VStack>
              <Text className="text-lg font-semibold">
                {participantName || 'Unknown User'}
              </Text>
              <HStack className="items-center gap-1" alignItems="center">
                {(() => {
                  // TODO: Re-enable typing indicators later
                  // const typingUsersInChat = typingUsers.get(chatId) || [];
                  const otherParticipant = chatMessages.find(
                    m => m.senderId !== user?.uid
                  )?.senderId;
                  // const isTyping =
                  //   otherParticipant &&
                  //   typingUsersInChat.includes(otherParticipant);

                  // if (isTyping) {
                  //   return (
                  //     <>
                  //       <Spinner size="small" />
                  //       <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                  //         typing...
                  //       </Text>
                  //     </>
                  //   );
                  // }

                  const isOnline = otherParticipant
                    ? userPresence.get(otherParticipant)?.online
                    : false;
                  return (
                    <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isOnline ? 'Online' : 'Offline'}
                    </Text>
                  );
                })()}
              </HStack>
            </VStack>
          </HStack>
        </HStack>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 16 }}
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
