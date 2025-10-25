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
      className="px-4 py-4"
      alignItems="center"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.border.default }}
    >
      {/* Avatar skeleton */}
      <Box className="relative mr-3">
        <Box
          className="w-12 h-12 rounded-full animate-pulse"
          style={{ backgroundColor: colors.bg.secondary }}
        />
      </Box>

      <VStack flex={1} space="xs">
        {/* Name skeleton */}
        <HStack
          className="justify-between items-center mb-1"
          alignItems="center"
        >
          <Box
            className="h-4 w-32 rounded animate-pulse"
            style={{ backgroundColor: colors.bg.secondary }}
          />
          <Box
            className="h-3 w-12 rounded animate-pulse"
            style={{ backgroundColor: colors.bg.secondary }}
          />
        </HStack>

        {/* Message preview skeleton */}
        <Box
          className="h-3 w-full rounded animate-pulse"
          style={{ backgroundColor: colors.bg.secondary }}
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
      className="items-center justify-between p-4"
      alignItems="center"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.border.default }}
    >
      <VStack space="xs">
        <Box
          className="h-6 w-20 rounded animate-pulse"
          style={{ backgroundColor: colors.bg.secondary }}
        />
        <Box
          className="h-4 w-40 rounded animate-pulse"
          style={{ backgroundColor: colors.bg.secondary }}
        />
      </VStack>
      <HStack className="gap-2" space="sm">
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
    <VStack className="flex-1">
      {showHeader && <SkeletonHeader />}

      {/* Skeleton list items */}
      {Array.from({ length: itemCount }, (_, index) => (
        <SkeletonItem key={index} />
      ))}
    </VStack>
  );
};

export default ListSkeleton;
