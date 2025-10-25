import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { Box } from '@ui/box';
import { HStack } from '@ui/hstack';
import { Text } from '@ui/text';
import { VStack } from '@ui/vstack';
import { Group } from '@chatapp/shared';
import { formatTime } from '@/utils';
import GroupMemberAvatars from './GroupMemberAvatars';

type GroupItemNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

interface GroupItemProps {
  group: Group;
}

const GroupItem: React.FC<GroupItemProps> = ({ group }) => {
  const navigation = useNavigation<GroupItemNavigationProp>();

  const lastMessageText = group.lastMessage?.text || 'No messages yet';
  const lastMessageTime = group.lastMessage?.createdAt
    ? formatTime(group.lastMessage.createdAt)
    : '';

  const handleGroupPress = () => {
    navigation.navigate('GroupChat', { groupId: group.id });
  };

  return (
    <Pressable onPress={handleGroupPress}>
      <Box className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <HStack space="md" alignItems="center">
          <GroupMemberAvatars
            memberIds={group.members}
            size="md"
            maxDisplay={3}
          />

          <VStack flex={1} space="xs">
            <HStack justifyContent="between" alignItems="center">
              <Text className="text-lg font-semibold">{group.name}</Text>
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
              {group.members.length} member
              {group.members.length !== 1 ? 's' : ''}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
};

export default GroupItem;
