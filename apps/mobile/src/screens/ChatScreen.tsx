import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ImagePlus, Camera, Image as ImageIcon } from 'lucide-react-native';
import { RootStackParamList } from '@/types/navigation';

import { Button, ButtonText } from '@ui/button';
import { Input, InputField } from '@ui/input';
import { Avatar, AvatarFallbackText } from '@ui/avatar';
import { Text } from '@ui/text';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicatorWrapper,
  ActionsheetDragIndicator,
  ActionsheetItem,
  ActionsheetItemText,
} from '@ui/actionsheet';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { usePresenceStore } from '@/store/presence';
import { ChatMessage } from '@chatapp/shared';
import {
  takePhoto,
  pickImage,
  uploadImage,
  UploadProgress,
} from '@/messaging/mediaUpload';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const { chatId, participantName } = route.params;
  const { user } = useAuthStore();
  const {
    messages,
    sendMessage,
    loadMessages,
    currentChatId,
    setCurrentChat,
    // TODO: Re-enable when typing indicators work
    // typingUsers,
    // startTyping,
    // stopTyping,
  } = useChatStore();
  const { userPresence } = usePresenceStore();

  const [messageText, setMessageText] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
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

  const handleImageUpload = async (imageUri: string) => {
    try {
      setUploadProgress({ bytesTransferred: 0, totalBytes: 100, progress: 0 });

      // Upload image to Firebase Storage
      const imageUrl = await uploadImage(chatId, imageUri, progress => {
        setUploadProgress(progress);
      });

      // Send message with image URL
      await sendMessage(chatId, '', imageUrl);

      setUploadProgress(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadProgress(null);
    }
  };

  const handleTakePhoto = async () => {
    setShowImagePicker(false);
    const uri = await takePhoto();
    if (uri) {
      await handleImageUpload(uri);
    }
  };

  const handlePickImage = async () => {
    setShowImagePicker(false);
    const uri = await pickImage();
    if (uri) {
      await handleImageUpload(uri);
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
        <HStack
          className="items-center p-4 border-t border-neutral-200 dark:border-neutral-700 gap-2"
          alignItems="center"
        >
          <Button
            onPress={() => setShowImagePicker(true)}
            size="md"
            variant="outline"
            className="px-3"
          >
            <ImagePlus size={20} color="#6B7280" />
          </Button>
          <Input className="flex-1">
            <InputField
              placeholder="Type a message..."
              value={messageText}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
            />
          </Input>
          <Button
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
            size="md"
          >
            <ButtonText>Send</ButtonText>
          </Button>
        </HStack>

        {/* Upload Progress */}
        {uploadProgress && (
          <Box className="absolute bottom-24 left-4 right-4 bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-lg">
            <Text className="text-sm mb-2">
              Uploading image... {Math.round(uploadProgress.progress)}%
            </Text>
            <Box className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <Box
                className="h-full bg-blue-500"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </Box>
          </Box>
        )}
      </KeyboardAvoidingView>

      {/* Image Picker Actionsheet */}
      <Actionsheet
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
      >
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <ActionsheetItem onPress={handleTakePhoto}>
            <HStack className="items-center gap-3" alignItems="center">
              <Camera size={20} />
              <ActionsheetItemText>Take Photo</ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
          <ActionsheetItem onPress={handlePickImage}>
            <HStack className="items-center gap-3" alignItems="center">
              <ImageIcon size={20} />
              <ActionsheetItemText>Choose from Library</ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
        </ActionsheetContent>
      </Actionsheet>

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
