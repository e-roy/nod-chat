import React, { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity, View, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Button, ButtonText } from '@ui/button';
import { Avatar, AvatarFallbackText } from '@ui/avatar';
// import { Spinner } from '@ui/spinner'; // TODO: Re-enable when typing indicators work
import { useAuthStore } from '../store/auth';
import { useChatStore } from '../store/chat';
import { usePresenceStore } from '../store/presence';
import { Chat } from '@chatapp/shared';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseApp';
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
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const email = userData.email || userId;
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

    return (
      <RNText style={{ fontSize: 16, fontWeight: '600' }}>{displayName}</RNText>
    );
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f0f0f0',
          }}
        >
          <View style={{ position: 'relative', marginRight: 12 }}>
            <Avatar size="md">
              <AvatarFallbackText>
                {getParticipantName(item).charAt(0).toUpperCase()}
              </AvatarFallbackText>
            </Avatar>
            {/* Presence Indicator */}
            {isOnline && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: '#10B981',
                  borderWidth: 2,
                  borderColor: '#fff',
                }}
              />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <ParticipantName chat={item} />
              <RNText
                style={{
                  fontSize: 12,
                  color: '#666',
                }}
              >
                {formatTime(lastMessageTime)}
              </RNText>
            </View>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              {/* TODO: Re-enable typing spinner later */}
              {/* {isTyping && <Spinner size="small" />} */}
              <RNText
                style={{
                  fontSize: 14,
                  color: '#666',
                  fontStyle: 'normal',
                }}
                numberOfLines={2}
              >
                {lastMessageText}
              </RNText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <RNText>Loading chats...</RNText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View style={{ alignItems: 'center', gap: 16 }}>
            <RNText style={{ color: '#ef4444', textAlign: 'center' }}>
              {error}
            </RNText>
            <Button onPress={clearError} variant="outline">
              <ButtonText>Try Again</ButtonText>
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1 }}>
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
          <View>
            <RNText style={{ fontSize: 24, fontWeight: 'bold' }}>Chats</RNText>
            <RNText style={{ fontSize: 14, color: '#666' }}>
              Welcome, {user?.displayName || user?.email || 'User'}!
            </RNText>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button onPress={() => navigation.navigate('NewChat')} size="sm">
              <ButtonText>New Chat</ButtonText>
            </Button>
            <Button onPress={handleSignOut} variant="outline" size="sm">
              <ButtonText>Sign Out</ButtonText>
            </Button>
          </View>
        </View>

        {/* Chat List */}
        {chats.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View style={{ alignItems: 'center', gap: 16 }}>
              <RNText
                style={{ fontSize: 18, color: '#666', textAlign: 'center' }}
              >
                No chats yet
              </RNText>
              <RNText
                style={{ fontSize: 14, color: '#999', textAlign: 'center' }}
              >
                Start a conversation with someone!
              </RNText>
            </View>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={item => item.id}
            renderItem={renderChatItem}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ChatListScreen;
