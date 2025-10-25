import React from 'react';
import {
  Image,
  TouchableOpacity,
  Text as RNText,
  StyleSheet,
} from 'react-native';
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react-native';
import { Avatar, AvatarFallbackText, AvatarImage } from '@ui/avatar';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { ChatMessage } from '@chatapp/shared';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

const COLORS = {
  GREEN: '#10b981',
} as const;

interface ReadByUser {
  uid: string;
  displayName?: string;
  photoURL?: string;
}

interface MessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showAvatar: boolean;
  senderName: string;
  senderPhotoURL?: string;
  isOnline: boolean;
  onImagePress: (imageUrl: string) => void;
  onRetry: (messageId: string) => void;
  // Group chat specific props
  isGroupChat?: boolean;
  readByUsers?: ReadByUser[];
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwnMessage,
  showAvatar,
  senderName,
  senderPhotoURL,
  isOnline,
  onImagePress,
  onRetry,
  isGroupChat = false,
  readByUsers = [],
}) => {
  const hasImage = !!message.imageUrl;
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

  const getMessageStatusIcon = (status: string) => {
    const iconSize = 14;
    const iconColor = status === 'read' ? '#3b82f6' : colors.text.muted;

    switch (status) {
      case 'sending':
        return (
          <Box>
            <Clock size={iconSize} color={iconColor} />
          </Box>
        );
      case 'sent':
        return (
          <Box>
            <Check size={iconSize} color={iconColor} />
          </Box>
        );
      case 'delivered':
        return (
          <Box>
            <CheckCheck size={iconSize} color={iconColor} />
          </Box>
        );
      case 'read':
        return (
          <Box>
            <CheckCheck size={iconSize} color={iconColor} />
          </Box>
        );
      case 'failed':
        return (
          <Box>
            <AlertCircle size={iconSize} color={colors.error} />
          </Box>
        );
      default:
        return null;
    }
  };

  const bubbleBackgroundColor = isOwnMessage
    ? isDark
      ? '#1d4ed8'
      : '#2563eb'
    : colors.bg.secondary;

  const textColor = isOwnMessage ? '#ffffff' : colors.text.primary;
  const timeColor = isOwnMessage
    ? isDark
      ? '#bfdbfe'
      : '#dbeafe'
    : colors.text.muted;

  return (
    <HStack style={styles.container} space="sm">
      {/* Left side: Avatar with online indicator or spacer */}
      <Box style={styles.avatarContainer}>
        {showAvatar && (
          <>
            <Avatar size="sm">
              {senderPhotoURL ? (
                <AvatarImage source={{ uri: senderPhotoURL }} />
              ) : (
                <AvatarFallbackText>{senderName.charAt(0)}</AvatarFallbackText>
              )}
            </Avatar>
            {/* Online indicator */}
            {isOnline && (
              <Box
                style={[
                  styles.onlineIndicator,
                  { borderColor: colors.bg.primary },
                ]}
              />
            )}
          </>
        )}
      </Box>

      {/* Message content - takes up remaining width */}
      <VStack flex={1} space="xs">
        {/* Message bubble with name, time, and content inside */}
        <Box
          style={[
            styles.messageBubble,
            {
              padding: hasImage ? 8 : 12,
              backgroundColor: bubbleBackgroundColor,
            },
          ]}
        >
          {/* Sender name and timestamp inside bubble */}
          <HStack space="sm" alignItems="center">
            <RNText style={[styles.senderName, { color: textColor }]}>
              {senderName}
            </RNText>
            <RNText style={[styles.timestamp, { color: timeColor }]}>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </RNText>
          </HStack>

          {/* Image content */}
          {hasImage && (
            <TouchableOpacity onPress={() => onImagePress(message.imageUrl!)}>
              <Image
                source={{ uri: message.imageUrl! }}
                style={styles.image}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Message text */}
          {message.text && (
            <RNText
              style={[
                styles.messageText,
                { color: textColor },
                hasImage && styles.messageTextWithImage,
              ]}
            >
              {message.text}
            </RNText>
          )}
        </Box>

        {/* Read indicators outside bubble at bottom right */}
        {isOwnMessage && message.status !== 'failed' && (
          <HStack space="xs" alignItems="center" justifyContent="end">
            {isGroupChat ? (
              // Group chat: Show avatars of users who have read the message
              readByUsers.length > 0 ? (
                <HStack space="xs" alignItems="center">
                  {readByUsers.slice(0, 3).map(user => (
                    <Avatar key={user.uid} size="xs">
                      {user.photoURL ? (
                        <AvatarImage source={{ uri: user.photoURL }} />
                      ) : (
                        <AvatarFallbackText>
                          {user.displayName?.charAt(0) || '?'}
                        </AvatarFallbackText>
                      )}
                    </Avatar>
                  ))}
                  {readByUsers.length > 3 && (
                    <RNText
                      style={[styles.readCount, { color: colors.text.muted }]}
                    >
                      +{readByUsers.length - 3}
                    </RNText>
                  )}
                </HStack>
              ) : (
                // Show a placeholder or nothing if no one has read it yet
                <RNText style={[styles.sentText, { color: colors.text.muted }]}>
                  Sent
                </RNText>
              )
            ) : (
              // 1-on-1 chat: Show status icon
              getMessageStatusIcon(message.status || 'sent')
            )}
          </HStack>
        )}

        {/* Failed message retry button outside bubble */}
        {isOwnMessage && message.status === 'failed' && (
          <TouchableOpacity onPress={() => onRetry(message.id)}>
            <HStack space="xs" alignItems="center">
              <Box>
                <AlertCircle size={14} color={colors.error} />
              </Box>
              <RNText style={[styles.failedText, { color: colors.error }]}>
                Failed to send. Tap to retry
              </RNText>
            </HStack>
          </TouchableOpacity>
        )}
      </VStack>
    </HStack>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    width: 32,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.GREEN,
    borderWidth: 2,
  },
  messageBubble: {
    borderRadius: 8,
    alignSelf: 'flex-start',
    width: '100%',
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  image: {
    width: 240,
    height: 240,
    borderRadius: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextWithImage: {
    marginTop: 8,
  },
  readCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  sentText: {
    fontSize: 12,
  },
  failedText: {
    fontSize: 12,
  },
});

export default MessageItem;
