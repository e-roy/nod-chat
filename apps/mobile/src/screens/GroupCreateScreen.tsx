import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Pressable,
  Alert,
  Text as RNText,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { Avatar, AvatarImage, AvatarFallbackText } from '@ui/avatar';
import { Button, ButtonText } from '@ui/button';
import { Box } from '@ui/box';
import { Checkbox, CheckboxIndicator } from '@ui/checkbox';
import { HStack } from '@ui/hstack';
import { Spinner } from '@ui/spinner';
import StyledInput from '@ui/StyledInput';
import { Text } from '@ui/text';
import { VStack } from '@ui/vstack';

import { useGroupStore } from '@/store/groups';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

import { db } from '@/firebase/firebaseApp';
import { User } from '@chatapp/shared';
import { RootStackParamList } from '@/types/navigation';
import { toTimestamp } from '@/utils/firestore';

type GroupCreateScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GroupCreate'
>;

const GroupCreateScreen = () => {
  const navigation = useNavigation<GroupCreateScreenNavigationProp>();
  const { createGroup } = useGroupStore();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

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
          createdAt: toTimestamp(data.createdAt),
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
            borderBottomColor: colors.border.default,
            backgroundColor: isSelected ? colors.bg.secondary : 'transparent',
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
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: colors.text.primary,
                }}
              >
                {item.displayName || item.email}
              </Text>
              <RNText style={[styles.email, { color: colors.text.secondary }]}>
                {item.email}
              </RNText>
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
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg.primary }]}
      >
        <VStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
          <RNText style={[styles.loadingText, { color: colors.text.primary }]}>
            Loading users...
          </RNText>
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
    >
      <VStack flex={1} style={{ padding: 16 }}>
        {/* Group Name Section */}
        <VStack space="sm" style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: colors.text.primary,
            }}
          >
            Group Name
          </Text>
          <StyledInput
            placeholder="Enter group name"
            value={groupName}
            onChangeText={setGroupName}
            style={{ flex: 0 }}
          />
        </VStack>

        {/* Create Button - Separate from input */}
        <Box style={{ marginBottom: 16 }}>
          <Button
            onPress={handleCreateGroup}
            disabled={
              creating || !groupName.trim() || selectedUsers.length === 0
            }
          >
            <ButtonText>{creating ? 'Creating...' : 'Create Group'}</ButtonText>
          </Button>
        </Box>

        {/* Members Selection Section */}
        <VStack space="sm" flex={1}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: colors.text.primary,
            }}
          >
            Select Members ({selectedUsers.length} selected)
          </Text>

          <FlatList
            data={availableUsers}
            keyExtractor={item => item.uid}
            renderItem={renderUserItem}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          />
        </VStack>
      </VStack>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  email: {
    fontSize: 14,
  },
  loadingText: {
    marginTop: 16,
  },
});

export default GroupCreateScreen;
