import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
  View,
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@ui/actionsheet';
import { VStack } from '@ui/vstack';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { useAIStore } from '@/store/ai';
import { useChatStore } from '@/store/chat';
import { CalendarContainer } from './CalendarContainer';

interface CalendarActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  onMessagePress?: (messageId: string) => void;
}

export const CalendarActionSheet: React.FC<CalendarActionSheetProps> = ({
  isOpen,
  onClose,
  chatId,
  onMessagePress,
}) => {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const { chatCalendar, loading, errors, clearError } = useAIStore();
  const { scrollToMessage } = useChatStore();

  const calendar = chatCalendar.get(chatId);
  const isLoading = loading.get(`calendar-${chatId}`) ?? false;
  const error = errors.get(`calendar-${chatId}`);

  const events = calendar?.events || [];

  const handleEventPress = async (messageId: string, eventChatId?: string) => {
    // Use the event's chatId if provided, otherwise use the current chatId
    const targetChatId = eventChatId || chatId;

    // Close the sheet first
    onClose();

    // Wait a moment for the sheet to close
    await new Promise(resolve => setTimeout(resolve, 300));

    // Scroll to the message in the chat with 'calendar' highlight type
    try {
      await scrollToMessage(targetChatId, messageId, 'calendar');
    } catch (err) {
      // Silently handle errors - navigation may not work in all scenarios
    }

    // Call the callback if provided (for additional parent logic)
    onMessagePress?.(messageId);
  };

  const handleRetry = () => {
    clearError(`calendar-${chatId}`);
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent style={{ backgroundColor: colors.bg.primary }}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <VStack space="md" style={styles.container}>
          <RNText style={[styles.title, { color: colors.text.primary }]}>
            Calendar Events
          </RNText>

          {/* Error State */}
          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={40} color={colors.error} />
              <RNText
                style={[styles.errorText, { color: colors.text.primary }]}
              >
                {error}
              </RNText>
              <TouchableOpacity
                onPress={handleRetry}
                style={[styles.retryButton, { backgroundColor: colors.info }]}
              >
                <RNText style={styles.retryButtonText}>Retry</RNText>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading State */}
          {!error && isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.info} />
              <RNText
                style={[styles.loadingText, { color: colors.text.secondary }]}
              >
                Loading calendar events...
              </RNText>
            </View>
          )}

          {/* Events List */}
          {!error && !isLoading && (
            <CalendarContainer
              events={events}
              onItemPress={handleEventPress}
              colors={colors}
            />
          )}
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    height: '85%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
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
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
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
});
