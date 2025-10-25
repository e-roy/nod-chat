import React, { useEffect } from 'react';
import { FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@ui/box';
import { Button, ButtonText } from '@ui/button';
import { Text } from '@ui/text';
import { VStack } from '@ui/vstack';

import { useGroupStore } from '@/store/groups';
import { useAuthStore } from '@/store/auth';
import { Group } from '@chatapp/shared';
import { RootStackParamList } from '@/types/navigation';
import GroupItem from '@/components/GroupItem';
import ListSkeleton from '@/components/ListSkeleton';

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

  const renderGroupItem = ({ item }: { item: Group }) => (
    <GroupItem group={item} />
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ListSkeleton itemCount={4} showHeader={false} />
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
