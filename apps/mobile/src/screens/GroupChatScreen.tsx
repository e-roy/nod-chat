import React, { useEffect, useState, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { db } from '@/firebase/firebaseApp';

import { Avatar, AvatarImage, AvatarFallbackText } from '@ui/avatar';
import { Box } from '@ui/box';
import { Button, ButtonText } from '@ui/button';
import { Text } from '@ui/text';
import { HStack } from '@ui/hstack';
import { VStack } from '@ui/vstack';
import { Input } from '@ui/input';
import { InputField } from '@ui/input';
import { Spinner } from '@ui/spinner';

import { useChatStore } from '@/store/chat';
import { useGroupStore } from '@/store/groups';
import { useAuthStore } from '@/store/auth';
import { ChatMessage, Group, User } from '@chatapp/shared';
import { RootStackParamList } from '@/types/navigation';

type GroupChatScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'GroupChat'
>;

const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ route }) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { groupId } = route.params;

  const {
    messages,
    sendMessage,
    loadMessages,
    markMessagesAsRead,
    currentChatId,
    initializeTransport: initializeChatTransport,
  } = useChatStore();
  const { groups, initializeTransport } = useGroupStore();
  const { user } = useAuthStore();

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [userCache, setUserCache] = useState<Map<string, User>>(new Map());
  const flatListRef = useRef<FlatList>(null);

  const group = groups.find(g => g.id === groupId);
  const chatMessages = messages.get(groupId) || [];

  useEffect(() => {
    if (groupId) {
      // Ensure both transports are initialized
      initializeChatTransport();
      initializeTransport();
      loadMessages(groupId);
      // Mark messages as read when entering the chat
      markMessagesAsRead(groupId);
    }
  }, [
    groupId,
    loadMessages,
    markMessagesAsRead,
    initializeChatTransport,
    initializeTransport,
  ]);

  // Note: Read status is handled by markMessagesAsRead in the chat store

  // Load user data for group members
  const loadUserData = async () => {
    if (!group?.members) return;

    try {
      const userIds = group.members.filter(id => !userCache.has(id));
      if (userIds.length === 0) return;

      const usersRef = db().collection('users').where('uid', 'in', userIds);
      const snapshot = await usersRef.get();

      const newUserCache = new Map(userCache);
      snapshot.forEach(doc => {
        const userData = doc.data();
        newUserCache.set(userData.uid, {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          online: userData.online || false,
          lastSeen: userData.lastSeen,
          createdAt: userData.createdAt?.toMillis?.() || Date.now(),
        });
      });

      setUserCache(newUserCache);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [group?.members]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(groupId, messageText.trim());
      setMessageText('');

      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSenderName = (senderId: string) => {
    if (senderId === user?.uid) return 'You';

    const cachedUser = userCache.get(senderId);
    if (cachedUser) {
      return cachedUser.displayName || cachedUser.email.split('@')[0];
    }

    // Fallback to showing last 4 characters of ID
    return `User ${senderId.slice(-4)}`;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.senderId === user?.uid;
    const senderName = getSenderName(item.senderId);

    return (
      <Box
        className={`p-3 mb-2 max-w-[80%] ${
          isOwnMessage ? 'self-end' : 'self-start'
        }`}
      >
        {!isOwnMessage && (
          <Text className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            {senderName}
          </Text>
        )}

        <Box
          className={`px-3 py-2 rounded-xl ${
            isOwnMessage
              ? 'bg-blue-500 rounded-br-md'
              : 'bg-neutral-200 dark:bg-neutral-700 rounded-bl-md'
          }`}
        >
          <Text
            className={`text-sm ${
              isOwnMessage
                ? 'text-white'
                : 'text-neutral-900 dark:text-neutral-100'
            }`}
          >
            {item.text}
          </Text>
        </Box>

        <HStack
          justifyContent={isOwnMessage ? 'end' : 'start'}
          className="mt-1"
          space="xs"
        >
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatTime(item.createdAt)}
          </Text>

          {isOwnMessage && (
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
              {item.status === 'sending'
                ? 'Sending...'
                : item.status === 'sent'
                  ? 'Sent'
                  : item.status === 'read'
                    ? 'Read'
                    : 'Delivered'}
            </Text>
          )}
        </HStack>

        {!isOwnMessage && item.readBy && (
          <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Read by {item.readBy.length} member
            {item.readBy.length !== 1 ? 's' : ''}
          </Text>
        )}
      </Box>
    );
  };

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <VStack className="flex-1 justify-center items-center">
          <Spinner size="large" />
          <Text className="mt-4 text-neutral-600 dark:text-neutral-300">
            Loading group...
          </Text>
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Group Header */}
        <Box className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <HStack space="md" alignItems="center">
            <Avatar size="lg">
              <AvatarImage source={{ uri: group.photoURL }} alt={group.name} />
              <AvatarFallbackText>{group.name}</AvatarFallbackText>
            </Avatar>

            <VStack flex={1}>
              <Text className="text-lg font-semibold">{group.name}</Text>
              <Text className="text-sm text-neutral-600 dark:text-neutral-300">
                {group.members.length} member
                {group.members.length !== 1 ? 's' : ''}
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <VStack className="flex-1 justify-center items-center p-8">
              <Text className="text-lg text-neutral-600 dark:text-neutral-300 text-center">
                No messages yet
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-2">
                Start the conversation!
              </Text>
            </VStack>
          }
        />

        {/* Message Input */}
        <Box className="p-4 border-t border-neutral-200 dark:border-neutral-700">
          <HStack space="md" alignItems="center">
            <Input className="flex-1">
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
              isDisabled={!messageText.trim() || sending}
              size="md"
            >
              <ButtonText>{sending ? 'Sending...' : 'Send'}</ButtonText>
            </Button>
          </HStack>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default GroupChatScreen;
