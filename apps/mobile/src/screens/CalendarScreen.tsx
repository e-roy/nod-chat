import React, { useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { useAIStore } from '@/store/ai';
import { useChatStore } from '@/store/chat';
import { useGroupStore } from '@/store/groups';
import { CalendarContainer } from '@/components/calendar';

export default function CalendarScreen() {
  const navigation = useNavigation();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const { user } = useAuthStore();
  const { userCalendar, loadUserCalendar, loading, errors, clearError } =
    useAIStore();
  const { scrollToMessage, chats } = useChatStore();
  const {
    groups,
    loadGroups,
    initializeTransport: initializeGroupTransport,
  } = useGroupStore();

  const isLoading = loading.get('user-calendar') ?? false;
  const error = errors.get('user-calendar');

  useEffect(() => {
    if (user) {
      loadUserCalendar(user.uid);
      // Load groups so we can navigate to them
      initializeGroupTransport();
      loadGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const events = userCalendar?.events || [];

  // Create a map of chatId -> chat name (including groups)
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
  // Add group names
  groups.forEach(group => {
    chatNames.set(group.id, group.name);
  });

  const handleItemPress = async (messageId: string, chatId?: string) => {
    // If chatId wasn't provided, find it from the event
    let targetChatId = chatId;
    if (!targetChatId) {
      const event = events.find(e => e.extractedFrom === messageId);
      if (!event || !event.chatId) return;
      targetChatId = event.chatId;
    }

    try {
      // Check if it's a group chat first
      const isGroup = targetChatId.startsWith('group_');

      if (isGroup) {
        // Find in groups
        const group = groups.find(g => g.id === targetChatId);
        if (!group) {
          return;
        }

        navigation.navigate('GroupChat', {
          groupId: targetChatId,
        });
      } else {
        // Find in regular chats
        const chat = chats.find(c => c.id === targetChatId);
        if (!chat) {
          return;
        }

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
          chatId: targetChatId,
          participantName,
        });
      }

      // Wait for navigation and messages to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Scroll to the message with retries
      let retries = 0;
      const maxRetries = 5;
      while (retries < maxRetries) {
        try {
          await scrollToMessage(targetChatId, messageId, 'calendar');
          break;
        } catch (err) {
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    } catch (err) {
      // Silently handle errors
    }
  };

  const handleRetry = () => {
    if (!user) return;
    clearError('user-calendar');
  };

  return (
    <Box style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <VStack space="md" style={styles.content}>
        <RNText style={[styles.title, { color: colors.text.primary }]}>
          Calendar Events
        </RNText>

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
              Loading calendar events...
            </RNText>
          </Box>
        )}

        {/* Events List */}
        {!error && !isLoading && (
          <CalendarContainer
            events={events}
            onItemPress={handleItemPress}
            showChatContext={true}
            chatNames={chatNames}
            colors={colors}
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
    color: '#FFFFFF',
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
