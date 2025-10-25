import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  initializeTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@theme_mode';

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  isDark: false,

  setMode: async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);

      let isDark = false;
      if (mode === 'dark') {
        isDark = true;
      } else if (mode === 'system') {
        // Use system appearance
        const systemColorScheme = Appearance.getColorScheme();
        isDark = systemColorScheme === 'dark';
      }

      set({ mode, isDark });
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  },

  toggleTheme: async () => {
    const { mode } = get();
    const newMode = mode === 'light' ? 'dark' : 'light';

    await get().setMode(newMode);
  },

  initializeTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const mode = (savedMode as ThemeMode) || 'system';

      let isDark = false;
      if (mode === 'dark') {
        isDark = true;
      } else if (mode === 'system') {
        const systemColorScheme = Appearance.getColorScheme();
        isDark = systemColorScheme === 'dark';
      }

      set({ mode, isDark });
    } catch (error) {
      console.error('Error loading theme mode:', error);
      set({ mode: 'system', isDark: false });
    }
  },
}));
