import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

import { Button, ButtonText } from '@ui/button';
import { Input, InputField } from '@ui/input';
import { Avatar, AvatarFallbackText } from '@ui/avatar';
// import { Spinner } from '@ui/spinner'; // TODO: Re-enable when typing indicators work
import { useChatStore } from '../store/chat';
import { useAuthStore } from '../store/auth';
import { usePresenceStore } from '../store/presence';
import { ChatMessage } from '@chatapp/shared';

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

    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          marginBottom: 12,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            maxWidth: '80%',
            alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
          }}
        >
          <View
            style={{
              backgroundColor: isOwnMessage ? '#007AFF' : '#f0f0f0',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
              borderTopLeftRadius: isOwnMessage ? 16 : 4,
              borderTopRightRadius: isOwnMessage ? 4 : 16,
            }}
          >
            <RNText
              style={{
                color: isOwnMessage ? '#fff' : '#000',
                fontSize: 14,
              }}
            >
              {item.text}
            </RNText>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 4,
              gap: 4,
            }}
          >
            <RNText
              style={{
                fontSize: 12,
                color: '#666',
              }}
            >
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </RNText>
            {isOwnMessage && (
              <RNText
                style={{
                  fontSize: 12,
                  color: item.status === 'read' ? '#007AFF' : '#666',
                  fontWeight: item.status === 'read' ? 'bold' : 'normal',
                }}
              >
                {getMessageStatusIcon(item.status || 'sent')}
              </RNText>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ position: 'relative' }}>
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
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: '#10B981',
                        borderWidth: 2,
                        borderColor: '#fff',
                      }}
                    />
                  )
                );
              })()}
            </View>
            <View>
              <RNText style={{ fontSize: 18, fontWeight: '600' }}>
                {participantName || 'Unknown User'}
              </RNText>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
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
                  //       <RNText style={{ fontSize: 14, color: '#666' }}>
                  //         typing...
                  //       </RNText>
                  //     </>
                  //   );
                  // }

                  const isOnline = otherParticipant
                    ? userPresence.get(otherParticipant)?.online
                    : false;
                  return (
                    <RNText style={{ fontSize: 14, color: '#666' }}>
                      {isOnline ? 'Online' : 'Offline'}
                    </RNText>
                  );
                })()}
              </View>
            </View>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Message Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            gap: 12,
          }}
        >
          <Input style={{ flex: 1 }}>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
