import React from 'react';
import { Text as RNText } from 'react-native';

interface MetadataDisplayProps {
  color: string;
  children: React.ReactNode;
}

export const MetadataDisplay: React.FC<MetadataDisplayProps> = ({
  color,
  children,
}) => (
  <RNText style={{ fontSize: 12, fontStyle: 'italic', color }}>
    {children}
  </RNText>
);
