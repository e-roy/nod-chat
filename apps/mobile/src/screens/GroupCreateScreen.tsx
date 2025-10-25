import React, { useState, useEffect } from 'react';
import { FlatList, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { Avatar, AvatarImage, AvatarFallbackText } from '@ui/avatar';
import { Button, ButtonText } from '@ui/button';
import { Box } from '@ui/box';
import { Checkbox, CheckboxIndicator } from '@ui/checkbox';
import { HStack } from '@ui/hstack';
import { Input } from '@ui/input';
import { InputField } from '@ui/input';
import { Spinner } from '@ui/spinner';
import { Text } from '@ui/text';
import { VStack } from '@ui/vstack';

import { useGroupStore } from '@/store/groups';
import { useAuthStore } from '@/store/auth';

import { db } from '@/firebase/firebaseApp';
import { User } from '@chatapp/shared';
import { RootStackParamList } from '@/types/navigation';

type GroupCreateScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GroupCreate'
>;

const GroupCreateScreen = () => {
  const navigation = useNavigation<GroupCreateScreenNavigationProp>();
  const { createGroup } = useGroupStore();
  const { user } = useAuthStore();

  const [groupName, setGroupName] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAvailableUsers();
  }, []);

  const loadAvailableUsers = async () => {
    if (!user) return;

    setLoadingUsers(true);
    try {
      // Get all users except current user
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '!=', user.uid));
      const snapshot = await getDocs(q);

      const users: User[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          uid: data.uid,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          online: data.online || false,
          lastSeen: data.lastSeen,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
        });
      });

      setAvailableUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    setCreating(true);
    try {
      const groupId = await createGroup(groupName.trim(), selectedUsers);
      if (groupId) {
        Alert.alert('Success', 'Group created successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item.uid);

    return (
      <Pressable onPress={() => toggleUserSelection(item.uid)}>
        <Box
          className={`p-4 border-b border-neutral-200 dark:border-neutral-700 ${
            isSelected ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-transparent'
          }`}
        >
          <HStack space="md" alignItems="center">
            <Checkbox
              value={item.uid}
              isChecked={isSelected}
              onChange={() => toggleUserSelection(item.uid)}
            >
              <CheckboxIndicator />
            </Checkbox>

            <Avatar size="md">
              {item.photoURL ? (
                <AvatarImage
                  source={{ uri: item.photoURL }}
                  alt={item.displayName || item.email}
                />
              ) : (
                <AvatarFallbackText>
                  {item.displayName || item.email}
                </AvatarFallbackText>
              )}
            </Avatar>

            <VStack flex={1}>
              <Text className="text-base font-medium">
                {item.displayName || item.email}
              </Text>
              <Text className="text-sm text-neutral-600 dark:text-neutral-300">
                {item.email}
              </Text>
            </VStack>

            {item.online && (
              <Box className="w-3 h-3 bg-green-500 rounded-full" />
            )}
          </HStack>
        </Box>
      </Pressable>
    );
  };

  if (loadingUsers) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <VStack className="flex-1 justify-center items-center">
          <Spinner size="large" />
          <Text className="mt-4 text-neutral-600 dark:text-neutral-300">
            Loading users...
          </Text>
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <VStack className="flex-1 p-4 space-y-4">
        <VStack className="space-y-2">
          <Text className="text-base font-medium">Group Name</Text>
          <Input>
            <InputField
              placeholder="Enter group name"
              value={groupName}
              onChangeText={setGroupName}
            />
          </Input>
          <Button
            onPress={handleCreateGroup}
            isDisabled={
              creating || !groupName.trim() || selectedUsers.length === 0
            }
            className="mt-4"
          >
            <ButtonText>{creating ? 'Creating...' : 'Create Group'}</ButtonText>
          </Button>
        </VStack>

        <VStack className="space-y-2">
          <Text className="text-base font-medium">
            Select Members ({selectedUsers.length} selected)
          </Text>

          <FlatList
            data={availableUsers}
            keyExtractor={item => item.uid}
            renderItem={renderUserItem}
            className="h-[60vh]"
            showsVerticalScrollIndicator={false}
          />
        </VStack>
      </VStack>
    </SafeAreaView>
  );
};

export default GroupCreateScreen;
