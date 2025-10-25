import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react-native';
import { Avatar, AvatarFallbackText, AvatarImage } from '@ui/avatar';
import { Text } from '@ui/text';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { ChatMessage } from '@chatapp/shared';

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

  const getMessageStatusIcon = (status: string) => {
    const iconSize = 14;
    const iconColor = status === 'read' ? '#3b82f6' : '#9ca3af';

    switch (status) {
      case 'sending':
        return <Clock size={iconSize} color={iconColor} />;
      case 'sent':
        return <Check size={iconSize} color={iconColor} />;
      case 'delivered':
        return <CheckCheck size={iconSize} color={iconColor} />;
      case 'read':
        return <CheckCheck size={iconSize} color={iconColor} />;
      case 'failed':
        return <AlertCircle size={iconSize} color="#ef4444" />;
      default:
        return null;
    }
  };

  return (
    <HStack className="mb-4 px-4" space="sm">
      {/* Left side: Avatar with online indicator or spacer */}
      <Box style={{ width: 32 }} className="relative">
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
              <Box className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-neutral-900" />
            )}
          </>
        )}
      </Box>

      {/* Message content - takes up remaining width */}
      <VStack className="flex-1" space="xs">
        {/* Message bubble with name, time, and content inside */}
        <Box
          className={`${hasImage ? 'p-2' : 'px-3 py-2'} rounded-lg ${
            isOwnMessage
              ? 'bg-blue-600 dark:bg-blue-700'
              : 'bg-neutral-100 dark:bg-neutral-800'
          } self-start w-full`}
        >
          {/* Sender name and timestamp inside bubble */}
          <HStack className="items-center gap-2 mb-1" alignItems="center">
            <Text
              className={`text-sm font-semibold ${
                isOwnMessage
                  ? 'text-white'
                  : 'text-neutral-900 dark:text-neutral-100'
              }`}
            >
              {senderName}
            </Text>
            <Text
              className={`text-xs ${
                isOwnMessage
                  ? 'text-blue-200 dark:text-blue-300'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </HStack>

          {/* Image content */}
          {hasImage && (
            <TouchableOpacity onPress={() => onImagePress(message.imageUrl!)}>
              <Image
                source={{ uri: message.imageUrl! }}
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 8,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Message text */}
          {message.text && (
            <Text
              className={`text-[15px] leading-5 ${hasImage ? 'mt-2' : ''} ${
                isOwnMessage
                  ? 'text-white'
                  : 'text-neutral-900 dark:text-neutral-100'
              }`}
            >
              {message.text}
            </Text>
          )}
        </Box>

        {/* Read indicators outside bubble at bottom right */}
        {isOwnMessage && message.status !== 'failed' && (
          <HStack
            className="items-center justify-end gap-1"
            alignItems="center"
            justifyContent="end"
          >
            {isGroupChat ? (
              // Group chat: Show avatars of users who have read the message
              readByUsers.length > 0 ? (
                <HStack className="items-center gap-0.5" space="xs">
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
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">
                      +{readByUsers.length - 3}
                    </Text>
                  )}
                </HStack>
              ) : (
                // Show a placeholder or nothing if no one has read it yet
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                  Sent
                </Text>
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
            <HStack className="items-center gap-1" alignItems="center">
              <AlertCircle size={14} color="#ef4444" />
              <Text className="text-xs text-red-500">
                Failed to send. Tap to retry
              </Text>
            </HStack>
          </TouchableOpacity>
        )}
      </VStack>
    </HStack>
  );
};

export default MessageItem;
