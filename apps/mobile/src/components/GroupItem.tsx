import React from 'react';
import { Pressable, Text as RNText, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { Box } from '@ui/box';
import { HStack } from '@ui/hstack';
import { VStack } from '@ui/vstack';
import { Group } from '@chatapp/shared';
import { formatTime } from '@/utils';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
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
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

  const lastMessageText = group.lastMessage?.text || 'No messages yet';
  const lastMessageTime = group.lastMessage?.createdAt
    ? formatTime(group.lastMessage.createdAt)
    : '';

  const handleGroupPress = () => {
    navigation.navigate('GroupChat', { groupId: group.id });
  };

  return (
    <Pressable onPress={handleGroupPress}>
      <Box
        style={{
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.default,
        }}
      >
        <HStack space="md" alignItems="center">
          <GroupMemberAvatars
            memberIds={group.members}
            size="md"
            maxDisplay={3}
          />

          <VStack flex={1} space="xs">
            <HStack justifyContent="between" alignItems="center">
              <RNText style={[styles.name, { color: colors.text.primary }]}>
                {group.name}
              </RNText>
              {lastMessageTime && (
                <RNText style={[styles.time, { color: colors.text.muted }]}>
                  {lastMessageTime}
                </RNText>
              )}
            </HStack>

            <RNText
              style={[styles.message, { color: colors.text.secondary }]}
              numberOfLines={2}
            >
              {lastMessageText}
            </RNText>

            <RNText style={[styles.members, { color: colors.text.muted }]}>
              {group.members.length} member
              {group.members.length !== 1 ? 's' : ''}
            </RNText>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  time: {
    fontSize: 14,
  },
  message: {
    fontSize: 14,
  },
  members: {
    fontSize: 12,
  },
});

export default GroupItem;
