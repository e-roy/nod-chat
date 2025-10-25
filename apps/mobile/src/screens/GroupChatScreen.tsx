import React, { useEffect, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { Box } from '@ui/box';
import { Text } from '@ui/text';
import { HStack } from '@ui/hstack';
import { VStack } from '@ui/vstack';
import { Spinner } from '@ui/spinner';

import { useChatStore } from '@/store/chat';
import { useGroupStore } from '@/store/groups';
import { useAuthStore } from '@/store/auth';
import { usePresenceStore } from '@/store/presence';
import { ChatMessage, User } from '@chatapp/shared';
import { RootStackParamList } from '@/types/navigation';
import MessageInput from '@/components/MessageInput';
import MessageItem from '@/components/MessageItem';
import GroupMemberAvatars from '@/components/GroupMemberAvatars';
import { ConnectionBanner } from '@/components/ConnectionBanner';

import { db } from '@/firebase/firebaseApp';

type GroupChatScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'GroupChat'
>;

const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ route }) => {
  const { groupId } = route.params;

  const {
    messages,
    sendMessage,
    loadMessages,
    markMessagesAsRead,
    retryMessage,
    initializeTransport: initializeChatTransport,
  } = useChatStore();
  const { groups, initializeTransport } = useGroupStore();
  const { user } = useAuthStore();
  const { userPresence } = usePresenceStore();

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

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', 'in', userIds));
      const snapshot = await getDocs(q);

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

  const handleImageUpload = async (imageUrl: string) => {
    try {
      await sendMessage(groupId, '', imageUrl);
    } catch (error) {
      console.error('Error sending image message:', error);
    }
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
    const senderName = getSenderName(item.senderId);

    // Check if we should show avatar (first message or different sender than previous)
    const prevMessage = index > 0 ? chatMessages[index - 1] : null;
    const showAvatar = !prevMessage || prevMessage.senderId !== item.senderId;

    // Get sender photo URL
    let senderPhotoURL: string | undefined;
    if (isOwnMessage) {
      senderPhotoURL = user?.photoURL;
    } else {
      const cachedUser = userCache.get(item.senderId);
      senderPhotoURL = cachedUser?.photoURL;
    }

    // Get online status for sender
    const isOnline = userPresence.get(item.senderId)?.online || false;

    // Get users who have read this message (excluding current user)
    const readByUsers = (item.readBy || [])
      .filter(uid => uid !== user?.uid)
      .map(uid => {
        const cachedUser = userCache.get(uid);
        return {
          uid,
          displayName:
            cachedUser?.displayName || cachedUser?.email?.split('@')[0],
          photoURL: cachedUser?.photoURL,
        };
      })
      .filter(u => u.displayName); // Only include users we have data for

    return (
      <MessageItem
        message={item}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar}
        senderName={senderName}
        senderPhotoURL={senderPhotoURL}
        isOnline={isOnline}
        onImagePress={() => {}} // Group chat doesn't support images yet
        onRetry={handleRetryMessage}
        isGroupChat={true}
        readByUsers={readByUsers}
      />
    );
  };

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
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
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={['top']}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Group Header */}
        <Box className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <HStack className="px-4 py-3" space="md" alignItems="center">
            <GroupMemberAvatars
              memberIds={group.members}
              size="sm"
              maxDisplay={4}
            />

            <VStack flex={1}>
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                {group.name}
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                {group.members.length} member
                {group.members.length !== 1 ? 's' : ''}
              </Text>
            </VStack>
          </HStack>
        </Box>

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
        <MessageInput
          chatId={groupId}
          messageText={messageText}
          onMessageTextChange={setMessageText}
          onSendMessage={handleSendMessage}
          onImageUpload={handleImageUpload}
          disabled={sending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default GroupChatScreen;
