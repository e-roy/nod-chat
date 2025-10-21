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
import { useChatStore } from '../store/chat';
import { useAuthStore } from '../store/auth';
import { ChatMessage } from '@chatapp/shared';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const { chatId, participantName } = route.params;
  const { user } = useAuthStore();
  const { messages, sendMessage, loadMessages, currentChatId, setCurrentChat } =
    useChatStore();

  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const chatMessages = messages.get(chatId) || [];

  useEffect(() => {
    setCurrentChat(chatId);
    loadMessages(chatId);
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

    try {
      await sendMessage(chatId, text);
    } catch (error) {
      console.error('Error sending message:', error);
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
          <RNText
            style={{
              fontSize: 12,
              color: '#666',
              marginTop: 4,
            }}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </RNText>
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
            <Avatar size="sm">
              <AvatarFallbackText>
                {participantName?.charAt(0) || 'U'}
              </AvatarFallbackText>
            </Avatar>
            <View>
              <RNText style={{ fontSize: 18, fontWeight: '600' }}>
                {participantName || 'Unknown User'}
              </RNText>
              <RNText style={{ fontSize: 14, color: '#666' }}>Online</RNText>
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
              onChangeText={setMessageText}
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
