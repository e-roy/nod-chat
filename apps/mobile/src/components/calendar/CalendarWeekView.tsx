import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  View,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Box } from '@ui/box';

import { CalendarEvent } from '@chatapp/shared';
import {
  getWeekDays,
  addWeeks,
  formatWeekHeader,
  getStartOfWeek,
  getEndOfWeek,
  type CalendarDate,
} from '@/utils/dateUtils';

interface CalendarWeekViewProps {
  events: CalendarEvent[];
  onItemPress: (messageId: string, chatId?: string) => void;
  showChatContext?: boolean;
  chatNames?: Map<string, string>;
  colors: {
    text: { primary: string; secondary: string; muted: string };
    bg: { primary: string; secondary: string };
    border: { default: string };
    info: string;
  };
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  events,
  onItemPress,
  showChatContext = false,
  chatNames = new Map(),
  colors,
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    getStartOfWeek(new Date())
  );

  const weekDays = getWeekDays(currentWeekStart);
  const weekEnd = getEndOfWeek(currentWeekStart);

  const handlePrevWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  // Group events by day for all days in the week
  const getDayEvents = (day: CalendarDate) => {
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);

    return events.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === dayDate.getTime();
    });
  };

  const isUpcoming = (timestamp: number) => {
    return timestamp > Date.now();
  };

  const hasEvents = weekDays.some(day => getDayEvents(day).length > 0);

  return (
    <View style={styles.container}>
      {/* Week header with navigation */}
      <View style={[styles.header, { backgroundColor: colors.bg.secondary }]}>
        <TouchableOpacity
          onPress={handlePrevWeek}
          accessibilityLabel="Previous week"
        >
          <ChevronLeft size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <RNText style={[styles.headerText, { color: colors.text.primary }]}>
          {formatWeekHeader(currentWeekStart, weekEnd)}
        </RNText>
        <TouchableOpacity
          onPress={handleNextWeek}
          accessibilityLabel="Next week"
        >
          <ChevronRight size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Horizontal scrolling week view */}
      {!hasEvents ? (
        <View style={styles.emptyContainer}>
          <RNText style={[styles.emptyText, { color: colors.text.secondary }]}>
            No events this week
          </RNText>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weekScroll}
          contentContainerStyle={styles.weekScrollContent}
        >
          {weekDays.map(day => {
            const dayEvents = getDayEvents(day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isDayToday = day.date.getTime() === today.getTime();

            return (
              <View
                key={day.timestamp}
                style={[
                  styles.dayColumn,
                  {
                    backgroundColor: colors.bg.primary,
                    borderRightColor: colors.border.default,
                  },
                ]}
              >
                {/* Day header */}
                <View
                  style={[
                    styles.dayHeader,
                    isDayToday && {
                      backgroundColor: colors.info + '20',
                    },
                  ]}
                >
                  <RNText
                    style={[
                      styles.dayHeaderDate,
                      { color: isDayToday ? colors.info : colors.text.primary },
                      { fontWeight: isDayToday ? '600' : '500' },
                    ]}
                  >
                    {day.dayName}
                  </RNText>
                  <RNText
                    style={[
                      styles.dayHeaderNumber,
                      {
                        color: isDayToday ? colors.info : colors.text.primary,
                        fontWeight: isDayToday ? '700' : '400',
                      },
                    ]}
                  >
                    {day.dayOfMonth}
                  </RNText>
                </View>

                {/* Day events - scrollable vertically */}
                {dayEvents.length === 0 ? (
                  <View style={styles.emptyDayContainer}>
                    <RNText
                      style={[
                        styles.emptyDayText,
                        { color: colors.text.muted },
                      ]}
                    >
                      No events
                    </RNText>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.eventsScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {dayEvents.map((event, index) => (
                      <TouchableOpacity
                        key={`${event.id}-${index}`}
                        onPress={() =>
                          onItemPress(
                            event.extractedFrom,
                            event.chatId || undefined
                          )
                        }
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
                          <RNText
                            style={[
                              styles.eventTitle,
                              { color: colors.text.primary },
                            ]}
                            numberOfLines={2}
                          >
                            {event.title}
                          </RNText>
                          {event.description && (
                            <RNText
                              style={[
                                styles.eventDescription,
                                { color: colors.text.secondary },
                              ]}
                              numberOfLines={2}
                            >
                              {event.description}
                            </RNText>
                          )}
                          {event.time && (
                            <RNText
                              style={[
                                styles.eventTime,
                                { color: colors.text.secondary },
                              ]}
                            >
                              {event.time}
                            </RNText>
                          )}
                          {showChatContext && event.chatId && (
                            <RNText
                              style={[
                                styles.chatContext,
                                { color: colors.text.muted },
                              ]}
                              numberOfLines={1}
                            >
                              {chatNames.get(event.chatId) || 'Chat'}
                            </RNText>
                          )}
                        </Box>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  weekScroll: {
    flex: 1,
  },
  weekScrollContent: {
    paddingRight: 8,
  },
  dayColumn: {
    width: 140,
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  dayHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  dayHeaderDate: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayHeaderNumber: {
    fontSize: 22,
    fontWeight: '400',
    marginTop: 2,
  },
  eventItem: {
    padding: 12,
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  chatContext: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 11,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
  },
  emptyDayContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  eventsScroll: {
    flex: 1,
  },
});
