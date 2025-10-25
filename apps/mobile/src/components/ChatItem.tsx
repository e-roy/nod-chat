import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text as RNText, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { Avatar, AvatarFallbackText, AvatarImage } from '@ui/avatar';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { Chat } from '@chatapp/shared';
import { formatTime } from '@/utils';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

type ChatItemNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

interface ChatItemProps {
  chat: Chat;
  user: { uid: string } | null;
  userPresence: Map<string, { online: boolean; lastSeen: number }>;
  userDisplayNames: Map<string, string>;
  userPhotoURLs: Map<string, string>;
  getUserDisplayName: (userId: string) => Promise<string>;
}

// Component to display participant name
const ParticipantName: React.FC<{
  chat: Chat;
  user: { uid: string } | null;
  getUserDisplayName: (userId: string) => Promise<string>;
  colors: {
    text: { primary: string };
  };
}> = ({ chat, user, getUserDisplayName, colors }) => {
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

  return (
    <RNText style={[styles.name, { color: colors.text.primary }]}>
      {displayName}
    </RNText>
  );
};

const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  user,
  userPresence,
  userDisplayNames,
  userPhotoURLs,
  getUserDisplayName,
}) => {
  const navigation = useNavigation<ChatItemNavigationProp>();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

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
        style={{
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.default,
        }}
        alignItems="center"
      >
        <Box style={{ marginRight: 12 }}>
          <Avatar size="md">
            {otherParticipant && userPhotoURLs.has(otherParticipant) ? (
              <AvatarImage
                source={{ uri: userPhotoURLs.get(otherParticipant)! }}
              />
            ) : (
              <AvatarFallbackText>{getAvatarInitials()}</AvatarFallbackText>
            )}
          </Avatar>
          {/* Presence Indicator */}
          {isOnline && (
            <Box
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500"
              style={{ borderWidth: 2, borderColor: colors.bg.primary }}
            />
          )}
        </Box>

        <VStack flex={1}>
          <HStack
            justifyContent="between"
            alignItems="center"
            style={{ marginBottom: 4 }}
          >
            <ParticipantName
              chat={chat}
              user={user}
              getUserDisplayName={getUserDisplayName}
              colors={colors}
            />
            <RNText style={[styles.time, { color: colors.text.muted }]}>
              {formatTime(lastMessageTime)}
            </RNText>
          </HStack>

          <HStack space="xs" alignItems="center">
            <RNText
              style={[styles.message, { color: colors.text.muted }]}
              numberOfLines={2}
            >
              {lastMessageText}
            </RNText>
          </HStack>
        </VStack>
      </HStack>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
  },
  message: {
    fontSize: 14,
  },
});

export default ChatItem;
