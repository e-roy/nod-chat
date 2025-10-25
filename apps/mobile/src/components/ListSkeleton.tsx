import React from 'react';
import { Box } from '@ui/box';
import { HStack } from '@ui/hstack';
import { VStack } from '@ui/vstack';

interface ListSkeletonProps {
  itemCount?: number;
  showHeader?: boolean;
}

const SkeletonItem = () => (
  <HStack
    className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-700"
    alignItems="center"
  >
    {/* Avatar skeleton */}
    <Box className="relative mr-3">
      <Box className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
    </Box>

    <VStack flex={1} space="xs">
      {/* Name skeleton */}
      <HStack className="justify-between items-center mb-1" alignItems="center">
        <Box className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <Box className="h-3 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </HStack>

      {/* Message preview skeleton */}
      <Box className="h-3 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
    </VStack>
  </HStack>
);

const SkeletonHeader = () => (
  <HStack
    className="items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700"
    alignItems="center"
  >
    <VStack space="xs">
      <Box className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      <Box className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
    </VStack>
    <HStack className="gap-2" space="sm">
      <Box className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      <Box className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
    </HStack>
  </HStack>
);

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
