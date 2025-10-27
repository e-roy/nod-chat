import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RefreshCw } from 'lucide-react-native';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { useAIStore } from '@/store/ai';
import { useChatStore } from '@/store/chat';
import { PriorityList } from '@/components/PriorityList';

export default function PrioritiesScreen() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const { user } = useAuthStore();
  const { userPriorities, loadUserPriorities, loading, errors, clearError } =
    useAIStore();
  const { scrollToMessage, chats } = useChatStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = loading.get('user-priorities') ?? false;
  const error = errors.get('user-priorities');

  useEffect(() => {
    if (user) {
      loadUserPriorities(user.uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const priorities = userPriorities?.priorities || [];
  const sortedPriorities = [...priorities].sort((a, b) => {
    // First sort by level: urgent comes before high
    if (a.level !== b.level) {
      return a.level === 'urgent' ? -1 : 1;
    }
    // Then sort by timestamp: most recent first
    return b.timestamp - a.timestamp;
  });

  // Create a map of chatId -> chat name
  const chatNames = new Map<string, string>();
  chats.forEach(chat => {
    // For one-on-one chats, get the other participant's name
    if (chat.name) {
      chatNames.set(chat.id, chat.name);
    } else {
      // Show "Chat" for one-on-one chats
      chatNames.set(chat.id, 'Chat');
    }
  });

  const handleItemPress = async (
    messageId: string,
    chatId: string,
    level: 'high' | 'urgent'
  ) => {
    const highlightType =
      level === 'urgent' ? 'priority-urgent' : 'priority-high';

    try {
      // Find the chat
      const chat = chats.find(c => c.id === chatId);
      if (!chat) {
        return;
      }

      // Navigate to the chat screen first
      if (chat.name) {
        // Group chat
        navigation.navigate('GroupChat', {
          groupId: chatId,
          groupName: chat.name,
        });
      } else {
        // One-on-one chat - get other participant info
        const otherParticipantId = chat.participants.find(p => p !== user?.uid);
        if (!otherParticipantId) {
          return;
        }

        const { transport } = useChatStore.getState();
        let participantName = otherParticipantId;

        if (transport) {
          try {
            const userInfo = await transport.getUserInfo(otherParticipantId);
            participantName =
              userInfo?.displayName || userInfo?.email || otherParticipantId;
          } catch {
            // Fallback to participant ID if lookup fails
          }
        }

        navigation.navigate('Chat', {
          chatId,
          participantName,
        });
      }

      // Wait for navigation and messages to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Scroll to the message
      await scrollToMessage(chatId, messageId, highlightType);
    } catch {
      // Silently handle errors
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      clearError('user-priorities');
      loadUserPriorities(user.uid);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch {
      // Silently handle errors
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetry = () => {
    if (!user) return;
    clearError('user-priorities');
    loadUserPriorities(user.uid);
  };

  return (
    <Box style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <VStack space="md" style={styles.content}>
        <HStack
          space="sm"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <RNText style={[styles.title, { color: colors.text.primary }]}>
            Priority Messages
          </RNText>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={isRefreshing}
            accessibilityLabel="Refresh priorities"
            accessibilityRole="button"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            ) : (
              <RefreshCw size={22} color={colors.text.secondary} />
            )}
          </TouchableOpacity>
        </HStack>

        {/* Error State */}
        {error && (
          <Box style={styles.errorContainer}>
            <RNText style={[styles.errorText, { color: colors.text.primary }]}>
              {error}
            </RNText>
            <TouchableOpacity
              onPress={handleRetry}
              style={[styles.retryButton, { backgroundColor: colors.info }]}
            >
              <RNText style={styles.retryButtonText}>Retry</RNText>
            </TouchableOpacity>
          </Box>
        )}

        {/* Loading State */}
        {!error && isLoading && (
          <Box style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.info} />
            <RNText
              style={[styles.loadingText, { color: colors.text.secondary }]}
            >
              Loading priorities...
            </RNText>
          </Box>
        )}

        {/* Priorities List */}
        {!error && !isLoading && (
          <PriorityList
            priorities={sortedPriorities}
            onItemPress={handleItemPress}
            showChatContext={true}
            chatNames={chatNames}
            colors={colors}
            emptyMessage="No priority messages found"
            emptySubmessage="Priority messages from all your chats will appear here"
          />
        )}
      </VStack>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
});
