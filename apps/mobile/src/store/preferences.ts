import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalendarViewMode = 'day' | 'week' | 'list';

interface PreferencesState {
  calendarViewMode: CalendarViewMode;
  setCalendarViewMode: (mode: CalendarViewMode) => Promise<void>;
  loadPreferences: () => Promise<void>;
}

const PREFERENCES_STORAGE_KEY = '@app_preferences';

export const usePreferencesStore = create<PreferencesState>(set => ({
  calendarViewMode: 'day', // Default to day view

  setCalendarViewMode: async (mode: CalendarViewMode) => {
    try {
      await AsyncStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({ calendarViewMode: mode })
      );
      set({ calendarViewMode: mode });
    } catch (error) {
      console.error('Error saving calendar view mode:', error);
    }
  },

  loadPreferences: async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored) as {
          calendarViewMode?: CalendarViewMode;
        };
        if (prefs.calendarViewMode) {
          set({ calendarViewMode: prefs.calendarViewMode });
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  },
}));
