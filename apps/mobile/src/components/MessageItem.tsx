import React, { useEffect, useRef } from 'react';
import {
  Image,
  TouchableOpacity,
  Text as RNText,
  StyleSheet,
  Animated,
} from 'react-native';
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react-native';
import { Avatar, AvatarFallbackText, AvatarImage } from '@ui/avatar';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { ChatMessage } from '@chatapp/shared';
import { useThemeStore } from '@/store/theme';
import { useChatStore } from '@/store/chat';
import { getColors } from '@/utils/colors';

const COLORS = {
  GREEN: '#10b981',
} as const;

/**
 * Safely format a timestamp to a time string with date context
 */
const formatMessageTime = (timestamp: number): string => {
  try {
    // Ensure timestamp is a valid number
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
      return '--:--';
    }

    const messageDate = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );

    // Check if message is from today
    const isToday = messageDay.getTime() === today.getTime();

    // Check if message is from yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = messageDay.getTime() === yesterday.getTime();

    // Format based on when the message was sent
    if (isToday) {
      // Just show the time for today's messages
      return messageDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (isYesterday) {
      // Show "Yesterday HH:MM"
      return `Yesterday ${messageDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else {
      // Show "MM/DD HH:MM" for older messages
      return messageDate.toLocaleString([], {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch (error) {
    console.warn('Error formatting timestamp:', error, timestamp);
    return '--:--';
  }
};

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
  const { highlightedMessageId, highlightType } = useChatStore();
  const colors = getColors(isDark);
  const isHighlighted = highlightedMessageId === message.id;

  // Pulse animation for highlighted messages
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isHighlighted) {
      // Start pulse animation when message becomes highlighted
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animation when not highlighted
      pulseAnim.setValue(1);
    }

    return () => {
      pulseAnim.stopAnimation();
    };
  }, [isHighlighted, pulseAnim]);

  // Determine base color for highlight
  const getBaseColor = () => {
    if (!isHighlighted || !highlightType) return null;

    if (highlightType === 'calendar') {
      return isDark
        ? { r: 56, g: 189, b: 248, a: 0.3 }
        : { r: 56, g: 189, b: 248, a: 0.2 };
    } else if (highlightType === 'priority-high') {
      return isDark
        ? { r: 249, g: 115, b: 22, a: 0.3 }
        : { r: 249, g: 115, b: 22, a: 0.2 };
    } else if (highlightType === 'priority-urgent') {
      return isDark
        ? { r: 239, g: 68, b: 68, a: 0.3 }
        : { r: 239, g: 68, b: 68, a: 0.2 };
    }
    return null;
  };

  const baseColor = getBaseColor();

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

  const bubbleBorderRadius = 16;

  // Interpolate opacity for background pulse effect
  const animatedOpacity = pulseAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.3, 1],
  });

  return (
    <Box
      style={[
        baseColor && {
          borderRadius: 8,
          marginHorizontal: 4,
          marginVertical: 2,
          overflow: 'hidden',
        },
      ]}
    >
      <Animated.View
        style={[
          baseColor && {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${baseColor.a})`,
            opacity: animatedOpacity,
          },
        ]}
      />
      <HStack style={styles.container} space="md" alignItems="start">
        {/* Left side: Avatar with online indicator or spacer */}
        <Box style={styles.avatarContainer}>
          {showAvatar && (
            <>
              <Avatar size="sm">
                {senderPhotoURL ? (
                  <AvatarImage source={{ uri: senderPhotoURL }} />
                ) : (
                  <AvatarFallbackText>
                    {senderName.charAt(0)}
                  </AvatarFallbackText>
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
                padding: hasImage ? 12 : 16,
                backgroundColor: bubbleBackgroundColor,
                borderRadius: bubbleBorderRadius,
                borderWidth: 1,
                borderColor: colors.border.muted,
              },
            ]}
          >
            {/* Sender name and timestamp inside bubble */}
            <HStack space="sm" alignItems="center">
              <RNText style={[styles.senderName, { color: textColor }]}>
                {senderName}
              </RNText>
              <RNText style={[styles.timestamp, { color: timeColor }]}>
                {formatMessageTime(message.createdAt)}
              </RNText>
            </HStack>

            {/* Image content */}
            {hasImage && (
              <TouchableOpacity
                onPress={() => onImagePress(message.imageUrl!)}
                style={{ marginTop: 8 }}
              >
                <Image
                  source={{ uri: message.imageUrl! }}
                  style={[
                    styles.image,
                    {
                      borderRadius: bubbleBorderRadius - 4,
                    },
                  ]}
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
                  <RNText
                    style={[styles.sentText, { color: colors.text.muted }]}
                  >
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
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    width: 36,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.GREEN,
    borderWidth: 2,
  },
  messageBubble: {
    alignSelf: 'flex-start',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.8,
  },
  image: {
    width: 240,
    height: 240,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
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
