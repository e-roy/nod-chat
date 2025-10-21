import React from 'react';
import { View, Text, ScrollView, Image, Pressable } from 'react-native';
import { cssInterop, verifyInstallation } from 'nativewind';
import '../global.css';

// Verify NativeWind installation
try {
  verifyInstallation();
  console.log('NativeWind installation verified successfully');
} catch (error) {
  console.error('NativeWind installation error:', error);
}

// Configure cssInterop for all React Native components
cssInterop(View, {
  className: 'style',
});

cssInterop(Text, {
  className: 'style',
});

cssInterop(ScrollView, {
  className: 'style',
});

cssInterop(Image, {
  className: 'style',
});

cssInterop(Pressable, {
  className: 'style',
});

export function RootLayout({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
