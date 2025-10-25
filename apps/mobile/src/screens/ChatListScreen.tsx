import React, { useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ButtonText } from '@ui/button';
import { Text } from '@ui/text';
import { VStack } from '@ui/vstack';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { usePresenceStore } from '@/store/presence';
import { Chat } from '@chatapp/shared';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseApp';
import ChatItem from '@/components/ChatItem';
import ListSkeleton from '@/components/ListSkeleton';
// TODO: Re-enable when typing indicators work
// import { ref, onValue } from 'firebase/database';
// import { rtdb } from '../firebase/firebaseApp';

const ChatListScreen: React.FC = () => {
  const { user } = useAuthStore();
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
  const { userPresence, subscribeToUserPresence } = usePresenceStore();
  const [userDisplayNames, setUserDisplayNames] = useState<Map<string, string>>(
    new Map()
  );

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

  // Function to get user display name by user ID
  const getUserDisplayName = async (userId: string): Promise<string> => {
    if (userDisplayNames.has(userId)) {
      return userDisplayNames.get(userId)!;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Prefer displayName, fallback to email, then userId
        const displayName = userData.displayName || userData.email || userId;
        setUserDisplayNames(prev => new Map(prev).set(userId, displayName));
        return displayName;
      }
    } catch (err) {
      console.error('Error fetching user display name:', err);
    }

    return userId; // Fallback to user ID if not found
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

  const renderChatItem = ({ item }: { item: Chat }) => (
    <ChatItem
      chat={item}
      user={user}
      userPresence={userPresence}
      userDisplayNames={userDisplayNames}
      getUserDisplayName={getUserDisplayName}
    />
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ListSkeleton itemCount={6} showHeader={true} />
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
    </SafeAreaView>
  );
};

export default ChatListScreen;
