import React from 'react';
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import AppNavigator from './src/navigation';
import { RootLayout } from './src/layout';

import { GluestackUIProvider } from '@ui/gluestack-ui-provider';

export default function App() {
  return (
    <RootLayout>
      <GluestackUIProvider mode="light">
        <AppNavigator />
        <StatusBar style="auto" />
      </GluestackUIProvider>
    </RootLayout>
  );
}
