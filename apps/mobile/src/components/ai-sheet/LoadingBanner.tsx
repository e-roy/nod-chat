import React from 'react';
import { ActivityIndicator, Text as RNText, StyleSheet } from 'react-native';
import { Box } from '@ui/box';

interface LoadingBannerProps {
  message: string;
  color: string;
}

export const LoadingBanner: React.FC<LoadingBannerProps> = ({
  message,
  color,
}) => (
  <Box
    style={[
      styles.banner,
      {
        backgroundColor: color + '20',
        borderColor: color + '40',
      },
    ]}
  >
    <ActivityIndicator size="small" color={color} />
    <RNText style={[styles.bannerText, { color }]}>{message}</RNText>
  </Box>
);

const styles = StyleSheet.create({
  banner: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
});
