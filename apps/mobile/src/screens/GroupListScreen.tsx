import React, { useEffect } from 'react';
import { FlatList, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Box,
  Text,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  HStack,
  VStack,
  Spinner,
  Button,
  ButtonText,
} from '@ui/index';
import { useGroupStore } from '../store/groups';
import { useAuthStore } from '../store/auth';
import { Group } from '@chatapp/shared';
import { RootStackParamList } from '../types/navigation';

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
        <Box
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          }}
        >
          <HStack space="md" alignItems="center">
            <Avatar size="lg">
              <AvatarImage source={{ uri: item.photoURL }} alt={item.name} />
              <AvatarFallbackText>{item.name}</AvatarFallbackText>
            </Avatar>

            <VStack flex={1} space="xs">
              <HStack justifyContent="between" alignItems="center">
                <Text fontSize="lg" fontWeight="semibold" color="black">
                  {item.name}
                </Text>
                {lastMessageTime && (
                  <Text fontSize="sm" color="gray500">
                    {lastMessageTime}
                  </Text>
                )}
              </HStack>

              <Text fontSize="sm" color="gray600" numberOfLines={2}>
                {lastMessageText}
              </Text>

              <Text fontSize="xs" color="gray500">
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
      <Box style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size="large" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>
          Loading groups...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <Text
          style={{ color: '#ef4444', textAlign: 'center', marginBottom: 16 }}
        >
          {error}
        </Text>
        <Button onPress={loadGroups}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </Box>
    );
  }

  return (
    <Box style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <FlatList
        data={groups}
        keyExtractor={item => item.id}
        renderItem={renderGroupItem}
        ListEmptyComponent={
          <Box
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 32,
            }}
          >
            <Text fontSize="lg" color="gray600" style={{ textAlign: 'center' }}>
              No groups yet
            </Text>
            <Text
              fontSize="sm"
              color="gray500"
              style={{ textAlign: 'center', marginTop: 8 }}
            >
              Create a group to start chatting with multiple people
            </Text>
            <Button
              style={{ marginTop: 16 }}
              onPress={() => navigation.navigate('GroupCreate')}
            >
              <ButtonText>Create Group</ButtonText>
            </Button>
          </Box>
        }
      />
    </Box>
  );
};

export default GroupListScreen;
