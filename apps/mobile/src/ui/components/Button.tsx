import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'solid',
  size = 'md',
  disabled = false,
  loading = false,
}) => {
  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
  ];

  const textStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'solid' ? '#ffffff' : '#007AFF'}
        />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  solid: {
    backgroundColor: '#007AFF',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  link: {
    backgroundColor: 'transparent',
  },
  xs: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  md: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lg: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  xl: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  solidText: {
    color: '#ffffff',
  },
  outlineText: {
    color: '#007AFF',
  },
  linkText: {
    color: '#007AFF',
  },
  xsText: {
    fontSize: 12,
  },
  smText: {
    fontSize: 14,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 18,
  },
  xlText: {
    fontSize: 20,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default Button;
