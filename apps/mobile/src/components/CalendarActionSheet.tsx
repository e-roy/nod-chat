import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
  View,
} from 'react-native';
import {
  RefreshCw,
  Calendar as CalendarIcon,
  AlertCircle,
} from 'lucide-react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@ui/actionsheet';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { useAIStore } from '@/store/ai';
import { useChatStore } from '@/store/chat';
import { CalendarEvent } from '@chatapp/shared';

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

  const handleEventPress = async (event: CalendarEvent) => {
    // Close the sheet first
    onClose();

    // Wait a moment for the sheet to close
    await new Promise(resolve => setTimeout(resolve, 300));

    // Scroll to the message in the chat with 'calendar' highlight type
    try {
      await scrollToMessage(chatId, event.extractedFrom, 'calendar');
    } catch (err) {
      console.error('Error scrolling to message:', err);
    }

    // Call the callback if provided (for additional parent logic)
    onMessagePress?.(event.extractedFrom);
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isUpcoming = (timestamp: number) => {
    return timestamp > Date.now();
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
          {!error && !isLoading && sortedEvents.length > 0 && (
            <ScrollView style={styles.scrollView}>
              {sortedEvents.map((event, index) => (
                <TouchableOpacity
                  key={`${event.id}-${index}`}
                  onPress={() => handleEventPress(event)}
                >
                  <Box
                    style={[
                      styles.eventItem,
                      {
                        backgroundColor: colors.bg.secondary,
                        borderColor: colors.border.default,
                        borderLeftColor: isUpcoming(event.date)
                          ? colors.info
                          : colors.text.muted,
                      },
                    ]}
                  >
                    <HStack
                      space="sm"
                      style={{
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <RNText
                        style={[
                          styles.eventTitle,
                          { color: colors.text.primary },
                        ]}
                        numberOfLines={2}
                      >
                        {event.title}
                      </RNText>
                      {isUpcoming(event.date) && (
                        <Box
                          style={[
                            styles.upcomingBadge,
                            { backgroundColor: colors.info + '20' },
                          ]}
                        >
                          <RNText
                            style={[
                              styles.upcomingText,
                              { color: colors.info },
                            ]}
                          >
                            Upcoming
                          </RNText>
                        </Box>
                      )}
                    </HStack>

                    <HStack
                      space="sm"
                      style={{ alignItems: 'center', marginBottom: 4 }}
                    >
                      <RNText
                        style={[
                          styles.eventDate,
                          { color: colors.text.secondary },
                        ]}
                      >
                        📅 {formatDate(event.date)}
                      </RNText>
                      {event.time && (
                        <RNText
                          style={[
                            styles.eventTime,
                            { color: colors.text.secondary },
                          ]}
                        >
                          🕐 {event.time}
                        </RNText>
                      )}
                    </HStack>

                    {event.participants && event.participants.length > 0 && (
                      <RNText
                        style={[
                          styles.participants,
                          { color: colors.text.muted },
                        ]}
                        numberOfLines={1}
                      >
                        👥 {event.participants.join(', ')}
                      </RNText>
                    )}

                    <RNText
                      style={[styles.tapHint, { color: colors.text.muted }]}
                    >
                      Tap to view source message
                    </RNText>
                  </Box>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Empty State */}
          {!error && !isLoading && sortedEvents.length === 0 && (
            <View style={styles.emptyContainer}>
              <CalendarIcon size={60} color={colors.text.muted} opacity={0.5} />
              <RNText
                style={[styles.emptyText, { color: colors.text.primary }]}
              >
                No calendar events yet
              </RNText>
              <RNText
                style={[styles.emptySubtext, { color: colors.text.muted }]}
              >
                Send messages with dates and times, and they'll automatically
                appear here
              </RNText>
              <RNText
                style={[styles.emptyExample, { color: colors.text.muted }]}
              >
                Try: "Let's meet tomorrow at 2pm"
              </RNText>
            </View>
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
  scrollView: {
    flex: 1,
  },
  eventItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  upcomingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  upcomingText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventDate: {
    fontSize: 14,
  },
  eventTime: {
    fontSize: 14,
  },
  participants: {
    fontSize: 12,
    marginBottom: 4,
  },
  tapHint: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 8,
  },
  emptyExample: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
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
