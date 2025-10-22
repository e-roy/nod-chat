import React from 'react';
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import AppNavigator from './src/navigation';
import { RootLayout } from './src/layout';
import { ThemeProvider } from './src/components/ThemeProvider';
import { useThemeStore } from './src/store/theme';

import { GluestackUIProvider } from '@ui/gluestack-ui-provider';

const AppContent: React.FC = () => {
  const { mode } = useThemeStore();

  return (
    <GluestackUIProvider mode={mode}>
      <AppNavigator />
      <StatusBar style="auto" />
    </GluestackUIProvider>
  );
};

export default function App() {
  return (
    <RootLayout>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </RootLayout>
  );
}
