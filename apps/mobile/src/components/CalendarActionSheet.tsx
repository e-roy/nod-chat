import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
  View,
} from 'react-native';
import { RefreshCw, AlertCircle } from 'lucide-react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@ui/actionsheet';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { useAIStore } from '@/store/ai';
import { useChatStore } from '@/store/chat';
import { CalendarList } from './CalendarList';

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
  const { chatCalendar, loadCalendar, loading, errors, clearError } =
    useAIStore();
  const { scrollToMessage } = useChatStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const calendar = chatCalendar.get(chatId);
  const isLoading = loading.get(`calendar-${chatId}`) ?? false;
  const error = errors.get(`calendar-${chatId}`);

  const sortedEvents = calendar?.events
    ? [...calendar.events].sort((a, b) => b.date - a.date) // Sort by latest date first
    : [];

  const handleEventPress = async (messageId: string, _chatId: string) => {
    // Close the sheet first
    onClose();

    // Wait a moment for the sheet to close
    await new Promise(resolve => setTimeout(resolve, 300));

    // Scroll to the message in the chat with 'calendar' highlight type
    try {
      await scrollToMessage(chatId, messageId, 'calendar');
    } catch (err) {
      console.error('Error scrolling to message:', err);
    }

    // Call the callback if provided (for additional parent logic)
    onMessagePress?.(messageId);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear error and reload calendar from Firestore
      clearError(`calendar-${chatId}`);
      loadCalendar(chatId);
      // Give it a moment to load
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error('Error refreshing calendar:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetry = () => {
    clearError(`calendar-${chatId}`);
    loadCalendar(chatId);
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent style={{ backgroundColor: colors.bg.primary }}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <VStack space="md" style={styles.container}>
          <HStack
            space="sm"
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <RNText style={[styles.title, { color: colors.text.primary }]}>
              Calendar Events
            </RNText>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={isRefreshing}
              accessibilityLabel="Refresh calendar"
              accessibilityRole="button"
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={colors.text.secondary} />
              ) : (
                <RefreshCw size={20} color={colors.text.secondary} />
              )}
            </TouchableOpacity>
          </HStack>

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
            <CalendarList
              events={sortedEvents}
              onItemPress={handleEventPress}
              colors={colors}
              emptyMessage="No calendar events yet"
              emptySubmessage="Send messages with dates and times, and they'll automatically appear here"
              emptyExample={'Try: "Let\'s meet tomorrow at 2pm"'}
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
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
