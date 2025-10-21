import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { tva } from '@gluestack-ui/utils/nativewind-utils';

const textStyle = tva({
  base: 'text-typography-900',
  variants: {
    fontSize: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
    },
    fontWeight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    color: {
      primary: 'text-primary-600',
      secondary: 'text-secondary-600',
      success: 'text-success-600',
      error: 'text-error-600',
      warning: 'text-warning-600',
      info: 'text-info-600',
      muted: 'text-typography-500',
      white: 'text-white',
      black: 'text-black',
      gray500: 'text-gray-500',
      gray600: 'text-gray-600',
      red500: 'text-red-500',
    },
    textAlign: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
});

type ITextProps = RNTextProps &
  VariantProps<typeof textStyle> & {
    className?: string;
    fontSize?:
      | 'xs'
      | 'sm'
      | 'md'
      | 'lg'
      | 'xl'
      | '2xl'
      | '3xl'
      | '4xl'
      | '5xl'
      | '6xl';
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    color?:
      | 'primary'
      | 'secondary'
      | 'success'
      | 'error'
      | 'warning'
      | 'info'
      | 'muted'
      | 'white'
      | 'black'
      | 'gray500'
      | 'gray600'
      | 'red500';
    textAlign?: 'left' | 'center' | 'right';
  };

const Text = React.forwardRef<React.ComponentRef<typeof RNText>, ITextProps>(
  function Text(
    {
      className,
      fontSize = 'md',
      fontWeight = 'normal',
      color,
      textAlign,
      ...props
    },
    ref
  ) {
    return (
      <RNText
        ref={ref}
        {...props}
        className={textStyle({
          class: className,
          fontSize,
          fontWeight,
          color,
          textAlign,
        })}
      />
    );
  }
);

Text.displayName = 'Text';
export { Text };
