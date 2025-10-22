import React, { useEffect } from 'react';
import { FlatList, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, AvatarImage, AvatarFallbackText } from '@ui/avatar';
import { Box } from '@ui/box';
import { Button, ButtonText } from '@ui/button';
import { HStack } from '@ui/hstack';
import { Spinner } from '@ui/spinner';
import { Text } from '@ui/text';
import { VStack } from '@ui/vstack';

import { useGroupStore } from '@/store/groups';
import { useAuthStore } from '@/store/auth';
import { Group } from '@chatapp/shared';
import { RootStackParamList } from '@/types/navigation';

type GroupListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

const GroupListScreen = () => {
  const navigation = useNavigation<GroupListScreenNavigationProp>();
  const { groups, loading, error, loadGroups, initializeTransport } =
    useGroupStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      initializeTransport();
      loadGroups();
    }
  }, [user, initializeTransport, loadGroups]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderGroupItem = ({ item }: { item: Group }) => {
    const lastMessageText = item.lastMessage?.text || 'No messages yet';
    const lastMessageTime = item.lastMessage?.createdAt
      ? formatTime(item.lastMessage.createdAt)
      : '';

    return (
      <Pressable
        onPress={() => navigation.navigate('GroupChat', { groupId: item.id })}
      >
        <Box className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <HStack space="md" alignItems="center">
            <Avatar size="lg">
              <AvatarImage source={{ uri: item.photoURL }} alt={item.name} />
              <AvatarFallbackText>{item.name}</AvatarFallbackText>
            </Avatar>

            <VStack flex={1} space="xs">
              <HStack justifyContent="between" alignItems="center">
                <Text className="text-lg font-semibold">{item.name}</Text>
                {lastMessageTime && (
                  <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                    {lastMessageTime}
                  </Text>
                )}
              </HStack>

              <Text
                className="text-sm text-neutral-600 dark:text-neutral-300"
                numberOfLines={2}
              >
                {lastMessageText}
              </Text>

              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                {item.members.length} member
                {item.members.length !== 1 ? 's' : ''}
              </Text>
            </VStack>
          </HStack>
        </Box>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <VStack className="flex-1 justify-center items-center">
          <Spinner size="large" />
          <Text className="mt-4 text-neutral-600 dark:text-neutral-300">
            Loading groups...
          </Text>
        </VStack>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <VStack className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500 dark:text-red-400 text-center mb-4">
            {error}
          </Text>
          <Button onPress={loadGroups}>
            <ButtonText>Retry</ButtonText>
          </Button>
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <VStack className="flex-1">
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={renderGroupItem}
          className="flex-1"
          ListEmptyComponent={
            <VStack className="flex-1 justify-center items-center p-8">
              <Text className="text-lg text-neutral-600 dark:text-neutral-300 text-center">
                No groups yet
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-2">
                Create a group to start chatting with multiple people
              </Text>
            </VStack>
          }
        />

        {/* Create Group Button - Always visible */}
        <Box className="p-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            className="w-full"
            onPress={() => navigation.navigate('GroupCreate')}
          >
            <ButtonText>Create Group</ButtonText>
          </Button>
        </Box>
      </VStack>
    </SafeAreaView>
  );
};

export default GroupListScreen;
