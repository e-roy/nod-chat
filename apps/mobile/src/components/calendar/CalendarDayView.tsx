import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  View,
  FlatList,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Box } from '@ui/box';
import { HStack } from '@ui/hstack';
import { CalendarEvent } from '@chatapp/shared';
import {
  getWeekDays,
  addDays,
  isSameDay,
  formatHeaderDate,
  type CalendarDate,
} from '@/utils/dateUtils';

interface CalendarDayViewProps {
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

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  events,
  onItemPress,
  showChatContext = false,
  chatNames = new Map(),
  colors,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekDays = getWeekDays(selectedDate);
  const selectedDateOnly = new Date(selectedDate);
  selectedDateOnly.setHours(0, 0, 0, 0);

  // Filter events for selected day
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === selectedDateOnly.getTime();
  });

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handlePrevDay = () => {
    setSelectedDate(addDays(selectedDate, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handlePrevWeek = () => {
    setSelectedDate(addDays(selectedDate, -7));
  };

  const handleNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const isUpcoming = (timestamp: number) => {
    return timestamp > Date.now();
  };

  return (
    <View style={styles.container}>
      {/* Date selector */}
      <View
        style={[styles.dateSelector, { backgroundColor: colors.bg.secondary }]}
      >
        <TouchableOpacity
          onPress={handlePrevWeek}
          accessibilityLabel="Previous week"
        >
          <ChevronLeft size={20} color={colors.text.secondary} />
        </TouchableOpacity>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weekDays}
        >
          {weekDays.map(day => (
            <TouchableOpacity
              key={day.timestamp}
              onPress={() => handleDaySelect(day.date)}
              style={[
                styles.dayButton,
                isSameDay(day.date, selectedDate) && {
                  backgroundColor: colors.info,
                },
              ]}
            >
              <RNText
                style={[
                  styles.dayName,
                  {
                    color: isSameDay(day.date, selectedDate)
                      ? '#ffffff'
                      : colors.text.muted,
                  },
                ]}
              >
                {day.dayName}
              </RNText>
              <RNText
                style={[
                  styles.dayNumber,
                  {
                    color: isSameDay(day.date, selectedDate)
                      ? '#ffffff'
                      : colors.text.primary,
                    fontWeight: isSameDay(day.date, selectedDate)
                      ? '600'
                      : '400',
                  },
                ]}
              >
                {day.dayOfMonth}
              </RNText>
              {day.isToday && !isSameDay(day.date, selectedDate) && (
                <View
                  style={[
                    styles.todayIndicator,
                    { backgroundColor: colors.info },
                  ]}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          onPress={handleNextWeek}
          accessibilityLabel="Next week"
        >
          <ChevronRight size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Current date header */}
      <View style={styles.header}>
        <RNText style={[styles.headerText, { color: colors.text.primary }]}>
          {formatHeaderDate(selectedDate)}
        </RNText>
        <TouchableOpacity onPress={handlePrevDay} style={styles.navButton}>
          <ChevronLeft size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNextDay} style={styles.navButton}>
          <ChevronRight size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Events list */}
      {filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <RNText style={[styles.emptyText, { color: colors.text.secondary }]}>
            No events on this day
          </RNText>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                onItemPress(item.extractedFrom, item.chatId || undefined)
              }
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
                  style={{ justifyContent: 'space-between', marginBottom: 8 }}
                >
                  <View style={{ flex: 1 }}>
                    <RNText
                      style={[
                        styles.eventTitle,
                        { color: colors.text.primary },
                      ]}
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
                        style={[
                          styles.chatContext,
                          { color: colors.text.muted },
                        ]}
                        numberOfLines={1}
                      >
                        {chatNames.get(item.chatId) || 'Chat'}
                      </RNText>
                    )}
                  </View>
                  {isUpcoming(item.date) && (
                    <View
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
                    </View>
                  )}
                </HStack>
                {item.time && (
                  <RNText
                    style={[styles.eventTime, { color: colors.text.secondary }]}
                  >
                    🕐 {item.time}
                  </RNText>
                )}
                {item.participants && item.participants.length > 0 && (
                  <RNText
                    style={[styles.participants, { color: colors.text.muted }]}
                  >
                    👥 {item.participants.join(', ')}
                  </RNText>
                )}
              </Box>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  weekDays: {
    flex: 1,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 50,
    position: 'relative',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '400',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  navButton: {
    padding: 8,
  },
  eventItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  chatContext: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  upcomingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  upcomingText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventTime: {
    fontSize: 14,
    marginTop: 8,
  },
  participants: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
  },
});
