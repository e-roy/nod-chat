import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  View,
} from 'react-native';
import { usePreferencesStore, CalendarViewMode } from '@/store/preferences';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

export const CalendarViewToggle: React.FC = () => {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const { calendarViewMode, setCalendarViewMode } = usePreferencesStore();

  const options: { label: string; mode: CalendarViewMode }[] = [
    { label: 'Day', mode: 'day' },
    { label: 'Week', mode: 'week' },
    { label: 'List', mode: 'list' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.secondary }]}>
      {options.map(option => {
        const isSelected = calendarViewMode === option.mode;
        return (
          <TouchableOpacity
            key={option.mode}
            onPress={() => setCalendarViewMode(option.mode)}
            style={[
              styles.option,
              isSelected && {
                backgroundColor: colors.info,
              },
            ]}
          >
            <RNText
              style={[
                styles.optionText,
                {
                  color: isSelected
                    ? colors.text.inverse
                    : colors.text.secondary,
                  fontWeight: isSelected ? '600' : '400',
                },
              ]}
            >
              {option.label}
            </RNText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    gap: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
});
