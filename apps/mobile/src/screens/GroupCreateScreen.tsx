import React, { useState, useEffect } from 'react';
import { FlatList, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  Box,
  Text,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  HStack,
  VStack,
  Input,
  InputField,
  Button,
  ButtonText,
  Spinner,
  Checkbox,
  CheckboxIndicator,
} from '@ui/index';
import { useGroupStore } from '../store/groups';
import { useAuthStore } from '../store/auth';
import { db } from '../firebase/firebaseApp';
import { User } from '@chatapp/shared';
import { RootStackParamList } from '../types/navigation';

type GroupCreateScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GroupCreate'
>;

const GroupCreateScreen = () => {
  const navigation = useNavigation<GroupCreateScreenNavigationProp>();
  const { createGroup, loading, error, clearError } = useGroupStore();
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
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
            backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
          }}
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
              <AvatarImage
                source={{ uri: item.photoURL }}
                alt={item.displayName || item.email}
              />
              <AvatarFallbackText>
                {item.displayName || item.email}
              </AvatarFallbackText>
            </Avatar>

            <VStack flex={1}>
              <Text fontSize="md" fontWeight="medium" color="black">
                {item.displayName || item.email}
              </Text>
              <Text fontSize="sm" color="gray600">
                {item.email}
              </Text>
            </VStack>

            {item.online && (
              <Box
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: '#10b981',
                  borderRadius: 6,
                }}
              />
            )}
          </HStack>
        </Box>
      </Pressable>
    );
  };

  if (loadingUsers) {
    return (
      <Box style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size="large" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>
          Loading users...
        </Text>
      </Box>
    );
  }

  return (
    <Box style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <VStack space="md" style={{ padding: 16 }}>
        <VStack space="sm">
          <Text fontSize="md" fontWeight="medium" color="black">
            Group Name
          </Text>
          <Input>
            <InputField
              placeholder="Enter group name"
              value={groupName}
              onChangeText={setGroupName}
            />
          </Input>
        </VStack>

        <VStack space="sm">
          <Text fontSize="md" fontWeight="medium" color="black">
            Select Members ({selectedUsers.length} selected)
          </Text>

          <FlatList
            data={availableUsers}
            keyExtractor={item => item.uid}
            renderItem={renderUserItem}
            style={{ maxHeight: 300 }}
            showsVerticalScrollIndicator={false}
          />
        </VStack>

        <Button
          onPress={handleCreateGroup}
          isDisabled={
            creating || !groupName.trim() || selectedUsers.length === 0
          }
          style={{ marginTop: 16 }}
        >
          <ButtonText>{creating ? 'Creating...' : 'Create Group'}</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
};

export default GroupCreateScreen;
