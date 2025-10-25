import React from 'react';
import { Box } from '@ui/box';
import { HStack } from '@ui/hstack';
import { VStack } from '@ui/vstack';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

interface ListSkeletonProps {
  itemCount?: number;
  showHeader?: boolean;
}

const SkeletonItem = () => {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

  return (
    <HStack
      style={{
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
      }}
      alignItems="center"
    >
      {/* Avatar skeleton */}
      <Box style={{ marginRight: 12 }}>
        <Box
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.bg.secondary,
          }}
        />
      </Box>

      <VStack flex={1} space="xs">
        {/* Name skeleton */}
        <HStack
          justifyContent="between"
          alignItems="center"
          style={{ marginBottom: 4 }}
        >
          <Box
            style={{
              height: 16,
              width: 128,
              borderRadius: 4,
              backgroundColor: colors.bg.secondary,
            }}
          />
          <Box
            style={{
              height: 12,
              width: 48,
              borderRadius: 4,
              backgroundColor: colors.bg.secondary,
            }}
          />
        </HStack>

        {/* Message preview skeleton */}
        <Box
          style={{
            height: 12,
            width: '100%',
            borderRadius: 4,
            backgroundColor: colors.bg.secondary,
          }}
        />
      </VStack>
    </HStack>
  );
};

const SkeletonHeader = () => {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

  return (
    <HStack
      alignItems="center"
      justifyContent="between"
      style={{
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
      }}
    >
      <VStack space="xs">
        <Box
          style={{
            height: 24,
            width: 80,
            borderRadius: 4,
            backgroundColor: colors.bg.secondary,
          }}
        />
        <Box
          style={{
            height: 16,
            width: 160,
            borderRadius: 4,
            backgroundColor: colors.bg.secondary,
          }}
        />
      </VStack>
      <HStack space="sm">
        <Box
          className="h-8 w-20 rounded animate-pulse"
          style={{ backgroundColor: colors.bg.secondary }}
        />
        <Box
          className="h-8 w-20 rounded animate-pulse"
          style={{ backgroundColor: colors.bg.secondary }}
        />
      </HStack>
    </HStack>
  );
};

const ListSkeleton: React.FC<ListSkeletonProps> = ({
  itemCount = 5,
  showHeader = true,
}) => {
  return (
    <VStack flex={1}>
      {showHeader && <SkeletonHeader />}

      {/* Skeleton list items */}
      {Array.from({ length: itemCount }, (_, index) => (
        <SkeletonItem key={index} />
      ))}
    </VStack>
  );
};

export default ListSkeleton;
