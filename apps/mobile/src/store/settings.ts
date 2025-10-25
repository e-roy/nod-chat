import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  initializeSettings: () => Promise<void>;
}

const SETTINGS_STORAGE_KEY = '@app_settings';

export const useSettingsStore = create<SettingsState>(set => ({
  notificationsEnabled: true,

  setNotificationsEnabled: async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ notificationsEnabled: enabled })
      );
      set({ notificationsEnabled: enabled });
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  },

  initializeSettings: async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        set({ notificationsEnabled: settings.notificationsEnabled ?? true });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      set({ notificationsEnabled: true });
    }
  },
}));
