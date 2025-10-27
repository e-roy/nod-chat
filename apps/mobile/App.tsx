import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import AppNavigator from './src/navigation';
import { useThemeStore } from './src/store/theme';
import { usePreferencesStore } from './src/store/preferences';

import { GluestackUIProvider } from '@ui/gluestack-ui-provider';

const AppContent: React.FC = () => {
  const { mode, isDark, initializeTheme } = useThemeStore();
  const { loadPreferences } = usePreferencesStore();

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // Initialize preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return (
    <View style={{ flex: 1 }}>
      <GluestackUIProvider mode={mode}>
        <AppNavigator />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </GluestackUIProvider>
    </View>
  );
};

export default function App() {
  return <AppContent />;
}
