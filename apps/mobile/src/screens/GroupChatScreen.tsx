import React, { useEffect, useState, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text as RNText,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { Box } from '@ui/box';
import { HStack } from '@ui/hstack';
import { VStack } from '@ui/vstack';
import { Spinner } from '@ui/spinner';

import { useChatStore } from '@/store/chat';
import { useGroupStore } from '@/store/groups';
import { useAuthStore } from '@/store/auth';
import { usePresenceStore } from '@/store/presence';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
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
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

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
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg.primary }]}
      >
        <VStack className="flex-1 justify-center items-center">
          <Spinner size="large" />
          <RNText
            style={[styles.loadingText, { color: colors.text.secondary }]}
          >
            Loading group...
          </RNText>
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Group Header */}
        <Box
          style={{
            backgroundColor: colors.bg.primary,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.default,
          }}
        >
          <HStack className="px-4 py-3" space="md" alignItems="center">
            <GroupMemberAvatars
              memberIds={group.members}
              size="sm"
              maxDisplay={4}
            />

            <VStack flex={1}>
              <RNText
                style={[styles.groupName, { color: colors.text.primary }]}
              >
                {group.name}
              </RNText>
              <RNText
                style={[styles.memberCount, { color: colors.text.muted }]}
              >
                {group.members.length} member
                {group.members.length !== 1 ? 's' : ''}
              </RNText>
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
          style={{ flex: 1, backgroundColor: colors.bg.primary }}
          contentContainerStyle={{ paddingVertical: 12 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <VStack className="flex-1 justify-center items-center p-8">
              <RNText
                style={[styles.emptyTitle, { color: colors.text.secondary }]}
              >
                No messages yet
              </RNText>
              <RNText
                style={[styles.emptySubtitle, { color: colors.text.muted }]}
              >
                Start the conversation!
              </RNText>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberCount: {
    fontSize: 12,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default GroupChatScreen;
