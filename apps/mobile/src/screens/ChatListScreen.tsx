import React, { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity, View, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Button, ButtonText } from '@ui/button';
import { Avatar, AvatarFallbackText } from '@ui/avatar';
import { useAuthStore } from '../store/auth';
import { useChatStore } from '../store/chat';
import { Chat } from '@chatapp/shared';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseApp';

type ChatListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListScreenNavigationProp>();
  const { user, signOut } = useAuthStore();
  const { chats, loading, error, initializeTransport, loadChats, clearError } =
    useChatStore();
  const [userEmails, setUserEmails] = useState<Map<string, string>>(new Map());

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
  }, [user, initializeTransport]);

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
    const lastMessageText = item.lastMessage?.text || 'No messages yet';
    const lastMessageTime = item.lastMessage?.createdAt || item.updatedAt;

    const handleChatPress = async () => {
      // Get the participant email for navigation
      const otherParticipant = item.participants.find(
        (p: string) => p !== user?.uid
      );

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
          <Avatar size="md" style={{ marginRight: 12 }}>
            <AvatarFallbackText>
              {getParticipantName(item).charAt(0).toUpperCase()}
            </AvatarFallbackText>
          </Avatar>

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

            <RNText
              style={{
                fontSize: 14,
                color: '#666',
              }}
              numberOfLines={2}
            >
              {lastMessageText}
            </RNText>
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
