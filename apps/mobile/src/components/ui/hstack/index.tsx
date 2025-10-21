import React from 'react';
import { View, ViewProps } from 'react-native';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { tva } from '@gluestack-ui/utils/nativewind-utils';

const hStackStyle = tva({
  base: 'flex flex-row',
  variants: {
    space: {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
      xl: 'gap-5',
      '2xl': 'gap-6',
      '3xl': 'gap-7',
      '4xl': 'gap-8',
    },
    alignItems: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    justifyContent: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    flex: {
      0: 'flex-0',
      1: 'flex-1',
      none: 'flex-none',
    },
  },
});

type IHStackProps = ViewProps &
  VariantProps<typeof hStackStyle> & {
    className?: string;
    space?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    justifyContent?:
      | 'start'
      | 'center'
      | 'end'
      | 'between'
      | 'around'
      | 'evenly';
    flex?: 0 | 1 | 'none';
  };

const HStack = React.forwardRef<React.ComponentRef<typeof View>, IHStackProps>(
  function HStack(
    {
      className,
      space = 'md',
      alignItems = 'center',
      justifyContent = 'start',
      flex,
      ...props
    },
    ref
  ) {
    return (
      <View
        ref={ref}
        {...props}
        className={hStackStyle({
          class: className,
          space,
          alignItems,
          justifyContent,
          flex,
        })}
      />
    );
  }
);

HStack.displayName = 'HStack';
export { HStack };
