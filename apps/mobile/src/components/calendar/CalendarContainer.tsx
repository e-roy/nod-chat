import React from 'react';
import { View } from 'react-native';
import { usePreferencesStore } from '@/store/preferences';
import { CalendarViewToggle } from './CalendarViewToggle';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarListView } from './CalendarListView';
import { CalendarEvent } from '@chatapp/shared';
import { getColors } from '@/utils/colors';
import { useThemeStore } from '@/store/theme';

interface CalendarContainerProps {
  events: CalendarEvent[];
  onItemPress: (messageId: string, chatId?: string) => void;
  showChatContext?: boolean;
  chatNames?: Map<string, string>;
  colors?: ReturnType<typeof getColors>;
}

export const CalendarContainer: React.FC<CalendarContainerProps> = ({
  events,
  onItemPress,
  showChatContext = false,
  chatNames = new Map(),
  colors: providedColors,
}) => {
  const { isDark } = useThemeStore();
  const colors = providedColors || getColors(isDark);
  const { calendarViewMode } = usePreferencesStore();

  const sortedEvents = [...events].sort((a, b) => b.date - a.date);

  return (
    <View style={{ flex: 1 }}>
      <CalendarViewToggle />
      {calendarViewMode === 'day' && (
        <CalendarDayView
          events={sortedEvents}
          onItemPress={onItemPress}
          showChatContext={showChatContext}
          chatNames={chatNames}
          colors={colors}
        />
      )}
      {calendarViewMode === 'week' && (
        <CalendarWeekView
          events={sortedEvents}
          onItemPress={onItemPress}
          showChatContext={showChatContext}
          chatNames={chatNames}
          colors={colors}
        />
      )}
      {calendarViewMode === 'list' && (
        <CalendarListView
          events={sortedEvents}
          onItemPress={onItemPress}
          showChatContext={showChatContext}
          chatNames={chatNames}
          colors={colors}
        />
      )}
    </View>
  );
};
