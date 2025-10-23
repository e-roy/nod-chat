import React, { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { Button, ButtonText } from '@ui/button';
import { Avatar, AvatarFallbackText } from '@ui/avatar';
import { Text } from '@ui/text';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
// import { Spinner } from '@ui/spinner'; // TODO: Re-enable when typing indicators work
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { usePresenceStore } from '@/store/presence';
import { Chat } from '@chatapp/shared';
import { db } from '@/firebase/firebaseApp';
// TODO: Re-enable when typing indicators work
// import { ref, onValue } from 'firebase/database';
// import { rtdb } from '../firebase/firebaseApp';

type ChatListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListScreenNavigationProp>();
  const { user, signOut } = useAuthStore();
  const {
    chats,
    loading,
    error,
    initializeTransport,
    loadChats,
    clearError,
    // TODO: Re-enable when typing indicators work
    // typingUsers,
  } = useChatStore();
  const { userPresence, subscribeToUserPresence, debugPresence } =
    usePresenceStore();
  const [userEmails, setUserEmails] = useState<Map<string, string>>(new Map());

  // TODO: Re-enable typing indicators later
  // Function to subscribe to typing indicator for a specific chat
  // const subscribeToTypingForChat = (chatId: string) => {
  //   const typingRef = ref(rtdb, `typing/${chatId}`);
  //   const callback = (snapshot: any) => {
  //     const data = snapshot.val();
  //     const typingUserIds: string[] = [];
  //     if (data && user) {
  //       Object.keys(data).forEach(uid => {
  //         if (uid !== user.uid && data[uid] === true) {
  //           typingUserIds.push(uid);
  //         }
  //       });
  //     }
  //     const { typingUsers, setTypingUsers } = useChatStore.getState();
  //     const newTypingUsers = new Map(typingUsers);
  //     if (typingUserIds.length > 0) {
  //       newTypingUsers.set(chatId, typingUserIds);
  //     } else {
  //       newTypingUsers.delete(chatId);
  //     }
  //     setTypingUsers(newTypingUsers);
  //   };
  //   const unsubscribe = onValue(typingRef, callback, error => {
  //     console.error('[ChatList] onValue ERROR for chatId:', chatId, error);
  //   });
  //   return unsubscribe;
  // };

  // Function to get user email by user ID
  const getUserEmail = async (userId: string): Promise<string> => {
    if (userEmails.has(userId)) {
      return userEmails.get(userId)!;
    }

    try {
      const userRef = db().collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const email = userData?.email || userId;
        setUserEmails(prev => new Map(prev).set(userId, email));
        return email;
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }

    return userId; // Fallback to user ID if email not found
  };

  useEffect(() => {
    if (user) {
      initializeTransport();
      loadChats();
    }
    // initializeTransport and loadChats are stable Zustand functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Subscribe to presence and typing for all chat participants
  useEffect(() => {
    if (chats.length > 0 && user) {
      const allParticipantIds = new Set<string>();
      chats.forEach(chat => {
        chat.participants.forEach(participantId => {
          if (participantId !== user.uid) {
            allParticipantIds.add(participantId);
          }
        });
      });

      // Subscribe to presence for all participants
      Array.from(allParticipantIds).forEach(participantId => {
        subscribeToUserPresence(participantId);
      });

      // TODO: Re-enable typing indicators later
      // Subscribe to typing indicators for all chats
      // const typingUnsubscribers: (() => void)[] = [];
      // chats.forEach(chat => {
      //   const unsubscribe = subscribeToTypingForChat(chat.id);
      //   typingUnsubscribers.push(unsubscribe);
      // });

      // return () => {
      //   // Clean up typing listeners when chats change
      //   typingUnsubscribers.forEach(unsubscribe => unsubscribe());
      // };
    }
    // Removed subscribeToUserPresence from dependencies as it's a stable Zustand function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, user]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const getParticipantName = (chat: Chat) => {
    if (chat.name) return chat.name;
    const otherParticipant = chat.participants.find(
      (p: string) => p !== user?.uid
    );
    return otherParticipant || 'Unknown User';
  };

  // Component to display participant name with email lookup
  const ParticipantName: React.FC<{ chat: Chat }> = ({ chat }) => {
    const [displayName, setDisplayName] = useState<string>('Loading...');

    useEffect(() => {
      const loadParticipantName = async () => {
        if (chat.name) {
          setDisplayName(chat.name);
          return;
        }

        const otherParticipant = chat.participants.find(
          (p: string) => p !== user?.uid
        );

        if (otherParticipant) {
          const email = await getUserEmail(otherParticipant);
          setDisplayName(email);
        } else {
          setDisplayName('Unknown User');
        }
      };

      loadParticipantName();
    }, [chat, user?.uid]);

    return <Text className="text-base font-semibold">{displayName}</Text>;
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const lastMessageTime = item.lastMessage?.createdAt || item.updatedAt;

    // Get the other participant's ID for presence check
    const otherParticipant = item.participants.find(
      (p: string) => p !== user?.uid
    );
    const isOnline = otherParticipant
      ? userPresence.get(otherParticipant)?.online
      : false;

    // TODO: Re-enable typing indicators later
    // const typingUsersInChat = typingUsers.get(item.id) || [];
    // const isTyping =
    //   otherParticipant && typingUsersInChat.includes(otherParticipant);

    // Show last message
    const lastMessageText = item.lastMessage?.text || 'No messages yet';

    const handleChatPress = async () => {
      // Get the participant email for navigation
      let participantName = 'Unknown User';
      if (otherParticipant) {
        participantName = await getUserEmail(otherParticipant);
      }

      navigation.navigate('Chat', {
        chatId: item.id,
        participantName,
      });
    };

    return (
      <TouchableOpacity onPress={handleChatPress}>
        <HStack
          className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-700"
          alignItems="center"
        >
          <Box className="relative mr-3">
            <Avatar size="md">
              <AvatarFallbackText>
                {getParticipantName(item).charAt(0).toUpperCase()}
              </AvatarFallbackText>
            </Avatar>
            {/* Presence Indicator */}
            {isOnline && (
              <Box className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-neutral-50 dark:border-neutral-950" />
            )}
          </Box>

          <VStack flex={1}>
            <HStack
              className="justify-between items-center mb-1"
              alignItems="center"
            >
              <ParticipantName chat={item} />
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatTime(lastMessageTime)}
              </Text>
            </HStack>

            <HStack className="items-center gap-1" alignItems="center">
              {/* TODO: Re-enable typing spinner later */}
              {/* {isTyping && <Spinner size="small" />} */}
              <Text
                className="text-sm text-neutral-500 dark:text-neutral-400"
                numberOfLines={2}
              >
                {lastMessageText}
              </Text>
            </HStack>
          </VStack>
        </HStack>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <VStack className="flex-1 justify-center items-center">
          <Text className="text-neutral-600 dark:text-neutral-300">
            Loading chats...
          </Text>
        </VStack>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <VStack className="flex-1 justify-center items-center p-4">
          <VStack className="items-center gap-4">
            <Text className="text-red-500 dark:text-red-400 text-center">
              {error}
            </Text>
            <Button onPress={clearError} variant="outline">
              <ButtonText>Try Again</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <VStack className="flex-1">
        {/* Header */}
        <HStack
          className="items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700"
          alignItems="center"
        >
          <VStack>
            <Text className="text-2xl font-bold">Chats</Text>
            <Text className="text-sm text-neutral-600 dark:text-neutral-300">
              Welcome, {user?.displayName || user?.email || 'User'}!
            </Text>
          </VStack>
          <HStack className="gap-2" space="sm">
            <Button onPress={() => navigation.navigate('NewChat')} size="sm">
              <ButtonText>New Chat</ButtonText>
            </Button>
            <Button onPress={handleSignOut} variant="outline" size="sm">
              <ButtonText>Sign Out</ButtonText>
            </Button>
          </HStack>
        </HStack>

        {/* Chat List */}
        {chats.length === 0 ? (
          <VStack className="flex-1 justify-center items-center p-4">
            <VStack className="items-center gap-4">
              <Text className="text-lg text-neutral-600 dark:text-neutral-300 text-center">
                No chats yet
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                Start a conversation with someone!
              </Text>
            </VStack>
          </VStack>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={item => item.id}
            renderItem={renderChatItem}
            className="flex-1"
          />
        )}
      </VStack>
    </SafeAreaView>
  );
};

export default ChatListScreen;
