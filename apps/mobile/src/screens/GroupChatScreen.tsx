import React, { useEffect, useState, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  Box,
  Text,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  HStack,
  VStack,
  Input,
  InputField,
  Button,
  ButtonText,
  Spinner,
} from '@ui/index';
import { useChatStore } from '../store/chat';
import { useGroupStore } from '../store/groups';
import { useAuthStore } from '../store/auth';
import { ChatMessage, Group, User } from '@chatapp/shared';
import { RootStackParamList } from '../types/navigation';
import { db } from '../firebase/firebaseApp';

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
        style={{
          padding: 12,
          marginBottom: 8,
          alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
          maxWidth: '80%',
        }}
      >
        {!isOwnMessage && (
          <Text fontSize="xs" color="gray500" style={{ marginBottom: 4 }}>
            {senderName}
          </Text>
        )}

        <Box
          style={{
            backgroundColor: isOwnMessage ? '#3b82f6' : '#f3f4f6',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            borderTopLeftRadius: isOwnMessage ? 12 : 4,
            borderTopRightRadius: isOwnMessage ? 4 : 12,
          }}
        >
          <Text color={isOwnMessage ? 'white' : 'black'} fontSize="md">
            {item.text}
          </Text>
        </Box>

        <HStack
          justifyContent={isOwnMessage ? 'end' : 'start'}
          style={{ marginTop: 4 }}
          space="xs"
        >
          <Text fontSize="xs" color="gray500">
            {formatTime(item.createdAt)}
          </Text>

          {isOwnMessage && (
            <Text fontSize="xs" color="gray500">
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
          <Text fontSize="xs" color="gray500" style={{ marginTop: 4 }}>
            Read by {item.readBy.length} member
            {item.readBy.length !== 1 ? 's' : ''}
          </Text>
        )}
      </Box>
    );
  };

  if (!group) {
    return (
      <Box style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size="large" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>
          Loading group...
        </Text>
      </Box>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Box style={{ flex: 1, backgroundColor: '#ffffff' }}>
        {/* Group Header */}
        <Box
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          }}
        >
          <HStack space="md" alignItems="center">
            <Avatar size="lg">
              <AvatarImage source={{ uri: group.photoURL }} alt={group.name} />
              <AvatarFallbackText>{group.name}</AvatarFallbackText>
            </Avatar>

            <VStack flex={1}>
              <Text fontSize="lg" fontWeight="semibold" color="black">
                {group.name}
              </Text>
              <Text fontSize="sm" color="gray600">
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
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <Box
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 32,
              }}
            >
              <Text
                fontSize="lg"
                color="gray600"
                style={{ textAlign: 'center' }}
              >
                No messages yet
              </Text>
              <Text
                fontSize="sm"
                color="gray500"
                style={{ textAlign: 'center', marginTop: 8 }}
              >
                Start the conversation!
              </Text>
            </Box>
          }
        />

        {/* Message Input */}
        <Box
          style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}
        >
          <HStack space="md" alignItems="center">
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
              isDisabled={!messageText.trim() || sending}
              size="md"
            >
              <ButtonText>{sending ? 'Sending...' : 'Send'}</ButtonText>
            </Button>
          </HStack>
        </Box>
      </Box>
    </KeyboardAvoidingView>
  );
};

export default GroupChatScreen;
