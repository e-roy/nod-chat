import React, { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { Avatar, AvatarFallbackText } from '@ui/avatar';
import { Text } from '@ui/text';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { Chat } from '@chatapp/shared';
import { formatTime } from '@/utils';

type ChatItemNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

interface ChatItemProps {
  chat: Chat;
  user: { uid: string } | null;
  userPresence: Map<string, { online: boolean; lastSeen: number }>;
  userDisplayNames: Map<string, string>;
  getUserDisplayName: (userId: string) => Promise<string>;
}

// Component to display participant name
const ParticipantName: React.FC<{
  chat: Chat;
  user: { uid: string } | null;
  getUserDisplayName: (userId: string) => Promise<string>;
}> = ({ chat, user, getUserDisplayName }) => {
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
        const name = await getUserDisplayName(otherParticipant);
        setDisplayName(name);
      } else {
        setDisplayName('Unknown User');
      }
    };

    loadParticipantName();
  }, [chat, getUserDisplayName, user?.uid]);

  return <Text className="text-base font-semibold">{displayName}</Text>;
};

const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  user,
  userPresence,
  userDisplayNames,
  getUserDisplayName,
}) => {
  const navigation = useNavigation<ChatItemNavigationProp>();

  // Helper function to generate initials from a name
  const generateInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0][0].toUpperCase();
  };

  const lastMessageTime = chat.lastMessage?.createdAt || chat.updatedAt;

  // Get the other participant's ID for presence check
  const otherParticipant = chat.participants.find(
    (p: string) => p !== user?.uid
  );
  const isOnline = otherParticipant
    ? userPresence.get(otherParticipant)?.online
    : false;

  // Show last message
  const lastMessageText = chat.lastMessage?.text || 'No messages yet';

  // Get initials for avatar
  const getAvatarInitials = () => {
    if (chat.name) {
      return generateInitials(chat.name);
    }
    if (otherParticipant) {
      const displayName = userDisplayNames.get(otherParticipant);
      if (displayName) {
        return generateInitials(displayName);
      }
    }
    return '?';
  };

  const handleChatPress = async () => {
    // Get the participant display name for navigation
    let participantName = 'Unknown User';
    if (otherParticipant) {
      participantName = await getUserDisplayName(otherParticipant);
    }

    navigation.navigate('Chat', {
      chatId: chat.id,
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
            <AvatarFallbackText>{getAvatarInitials()}</AvatarFallbackText>
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
            <ParticipantName
              chat={chat}
              user={user}
              getUserDisplayName={getUserDisplayName}
            />
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

export default ChatItem;
