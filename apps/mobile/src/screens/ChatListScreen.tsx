import React, { useEffect } from 'react';
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

type ChatListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListScreenNavigationProp>();
  const { user, signOut } = useAuthStore();
  const { chats, loading, error, initializeTransport, loadChats, clearError } =
    useChatStore();

  useEffect(() => {
    if (user) {
      initializeTransport();
      loadChats();
    }
  }, [user, initializeTransport, loadChats]);

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
    return otherParticipant
      ? `User ${otherParticipant.slice(0, 8)}`
      : 'Unknown User';
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const participantName = getParticipantName(item);
    const lastMessageText = item.lastMessage?.text || 'No messages yet';
    const lastMessageTime = item.lastMessage?.createdAt || item.updatedAt;

    const handleChatPress = () => {
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
              {participantName.charAt(0).toUpperCase()}
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
              <RNText
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {participantName}
              </RNText>
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
