import React from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  View,
} from 'react-native';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { CalendarEvent } from '@chatapp/shared';

interface CalendarListProps {
  events: CalendarEvent[];
  onItemPress: (messageId: string, chatId: string) => void;
  showChatContext?: boolean;
  chatNames?: Map<string, string>; // chatId -> name
  emptyMessage?: string;
  emptySubmessage?: string;
  emptyExample?: string;
  colors: {
    text: { primary: string; secondary: string; muted: string };
    bg: { primary: string; secondary: string };
    border: { default: string };
    error: string;
    warning: string;
    info: string;
  };
}

export const CalendarList: React.FC<CalendarListProps> = ({
  events,
  onItemPress,
  showChatContext = false,
  chatNames = new Map(),
  emptyMessage = 'No calendar events yet',
  emptySubmessage = "Send messages with dates and times, and they'll automatically appear here",
  emptyExample = 'Try: "Let\'s meet tomorrow at 2pm"',
  colors,
}) => {
  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <CalendarIcon size={60} color={colors.text.muted} opacity={0.5} />
        <RNText style={[styles.emptyText, { color: colors.text.primary }]}>
          {emptyMessage}
        </RNText>
        <RNText style={[styles.emptySubtext, { color: colors.text.muted }]}>
          {emptySubmessage}
        </RNText>
        {emptyExample && (
          <RNText style={[styles.emptyExample, { color: colors.text.muted }]}>
            {emptyExample}
          </RNText>
        )}
      </View>
    );
  }

  const isUpcoming = (timestamp: number) => {
    return timestamp > Date.now();
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

  return (
    <ScrollView style={styles.scrollView}>
      {events.map((event, index) => {
        const item = event as CalendarEvent & { chatId?: string };
        return (
          <TouchableOpacity
            key={`${item.id}-${index}`}
            onPress={() => onItemPress(item.extractedFrom, item.chatId || '')}
          >
            <Box
              style={[
                styles.eventItem,
                {
                  backgroundColor: colors.bg.secondary,
                  borderColor: colors.border.default,
                  borderLeftColor: isUpcoming(item.date)
                    ? colors.info
                    : colors.text.muted,
                },
              ]}
            >
              <HStack
                space="sm"
                style={{
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <VStack space="xs" style={{ flex: 1 }}>
                  <RNText
                    style={[styles.eventTitle, { color: colors.text.primary }]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </RNText>
                  {item.description && (
                    <RNText
                      style={[
                        styles.eventDescription,
                        { color: colors.text.secondary },
                      ]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </RNText>
                  )}
                  {showChatContext && item.chatId && (
                    <RNText
                      style={[styles.chatContext, { color: colors.text.muted }]}
                      numberOfLines={1}
                    >
                      {chatNames.get(item.chatId) || 'Chat'}
                    </RNText>
                  )}
                </VStack>
                {isUpcoming(item.date) && (
                  <Box
                    style={[
                      styles.upcomingBadge,
                      { backgroundColor: colors.info + '20' },
                    ]}
                  >
                    <RNText
                      style={[styles.upcomingText, { color: colors.info }]}
                    >
                      Upcoming
                    </RNText>
                  </Box>
                )}
              </HStack>

              <VStack space="xs" style={{ marginBottom: 8 }}>
                <HStack space="md" style={{ alignItems: 'center' }}>
                  <RNText
                    style={[styles.eventDate, { color: colors.text.secondary }]}
                  >
                    📅 {formatDate(item.date)}
                  </RNText>
                  {item.time && (
                    <RNText
                      style={[
                        styles.eventTime,
                        { color: colors.text.secondary },
                      ]}
                    >
                      🕐 {item.time}
                    </RNText>
                  )}
                </HStack>

                {item.participants && item.participants.length > 0 && (
                  <RNText
                    style={[styles.participants, { color: colors.text.muted }]}
                    numberOfLines={2}
                  >
                    👥 {item.participants.join(', ')}
                  </RNText>
                )}
              </VStack>

              <RNText style={[styles.tapHint, { color: colors.text.muted }]}>
                Tap to view source message
              </RNText>
            </Box>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  eventItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  eventDescription: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  chatContext: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
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
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
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
});
