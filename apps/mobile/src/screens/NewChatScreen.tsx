import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Pressable,
  Alert,
  Text as RNText,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { Avatar, AvatarImage, AvatarFallbackText } from '@ui/avatar';
import { Button, ButtonText } from '@ui/button';
import { Box } from '@ui/box';
import { HStack } from '@ui/hstack';
import { Spinner } from '@ui/spinner';
import StyledInput from '@ui/StyledInput';
import { Text } from '@ui/text';
import { VStack } from '@ui/vstack';

import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { db } from '@/firebase/firebaseApp';
import { User } from '@chatapp/shared';
import { toTimestamp } from '@/utils/firestore';

type NewChatScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'NewChat'
>;

const NewChatScreen: React.FC = () => {
  const navigation = useNavigation<NewChatScreenNavigationProp>();
  const { user, loading: authLoading } = useAuthStore();
  const { createChat, error, clearError } = useChatStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const [participantEmail, setParticipantEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

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
    } catch (err) {
      console.error('Error loading users:', err);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg.primary }]}
      >
        <VStack flex={1} justifyContent="center" alignItems="center">
          <RNText style={{ color: colors.text.primary }}>Loading...</RNText>
        </VStack>
      </SafeAreaView>
    );
  }

  // Show error if user is not authenticated
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg.primary }]}
      >
        <VStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          style={{ padding: 16 }}
        >
          <RNText style={[styles.errorText, { color: colors.error }]}>
            Not authenticated
          </RNText>
          <Button onPress={() => navigation.goBack()}>
            <ButtonText>Go Back</ButtonText>
          </Button>
        </VStack>
      </SafeAreaView>
    );
  }

  const handleUserSelect = (selectedUser: User) => {
    // Auto-fill the email when a user is selected
    setParticipantEmail(selectedUser.email);
  };

  const handleCreateChat = async () => {
    if (!participantEmail.trim()) return;

    if (!user) {
      console.error('No user available for creating chat');
      return;
    }

    setLoading(true);
    clearError(); // Clear any previous errors

    try {
      // Look up user by email to get their Firebase user ID
      const { transport } = useChatStore.getState();
      if (!transport) {
        console.error('Transport not initialized');
        return;
      }

      const participantId = await transport.findUserByEmail(
        participantEmail.trim()
      );

      if (!participantId) {
        console.error(`No user found with email: ${participantEmail}`);
        return;
      }

      // Get user info to pass display name
      const userInfo = await transport.getUserInfo(participantId);
      const participantName = userInfo?.displayName || participantEmail;

      const chatId = await createChat([participantId]);

      if (chatId) {
        navigation.navigate('Chat', {
          chatId,
          participantName,
        });
      }
    } catch (err) {
      console.error('Error creating chat:', err);
      console.error('Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = participantEmail === item.email;

    return (
      <Pressable onPress={() => handleUserSelect(item)}>
        <Box
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.default,
            backgroundColor: isSelected ? colors.bg.secondary : 'transparent',
          }}
        >
          <HStack space="md" alignItems="center">
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
        {/* Header Section */}
        <VStack space="sm" style={{ marginBottom: 16 }}>
          <RNText style={[styles.title, { color: colors.text.primary }]}>
            Start New Chat
          </RNText>
          <RNText style={[styles.subtitle, { color: colors.text.secondary }]}>
            Select a user or enter their email address
          </RNText>
        </VStack>

        {/* Input Section */}
        <VStack space="sm" style={{ marginBottom: 16 }}>
          <StyledInput
            placeholder="Enter user email"
            value={participantEmail}
            onChangeText={setParticipantEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={{ flex: 0 }}
          />
        </VStack>

        {/* Start Chat Button */}
        <Box style={{ marginBottom: 16 }}>
          <Button
            onPress={handleCreateChat}
            disabled={!participantEmail.trim() || loading}
          >
            <ButtonText>{loading ? 'Creating...' : 'Start Chat'}</ButtonText>
          </Button>
        </Box>

        {error && (
          <RNText
            style={[styles.error, { color: colors.error, marginBottom: 16 }]}
          >
            {error}
          </RNText>
        )}

        {/* Available Users List */}
        <VStack space="sm" flex={1}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: colors.text.primary,
            }}
          >
            Available Users ({availableUsers.length})
          </Text>

          <FlatList
            data={availableUsers}
            keyExtractor={item => item.uid}
            renderItem={renderUserItem}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <VStack
                justifyContent="center"
                alignItems="center"
                style={{ padding: 32 }}
              >
                <RNText
                  style={[styles.emptyText, { color: colors.text.secondary }]}
                >
                  No users available
                </RNText>
              </VStack>
            }
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
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  email: {
    fontSize: 14,
  },
  loadingText: {
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default NewChatScreen;
