import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useThemeStore } from '@/store/theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isDark, initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // Apply dark class to root element
  useEffect(() => {
    // For React Native, we need to apply the dark mode class to the root View
    // This is a simplified approach - in a real app you might want to use a more sophisticated solution
    // The dark class will be applied via className
  }, [isDark]);

  return (
    <View style={{ flex: 1 }} className={isDark ? 'dark' : ''}>
      {children}
    </View>
  );
};
