import React, { useState } from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';

import { Button, ButtonText } from '@ui/button';
import { Box } from '@ui/box';
import StyledInput from '@ui/StyledInput';
import { VStack } from '@ui/vstack';

import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

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
    } catch (error) {
      console.error('Error creating chat:', error);
      console.error('Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
    >
      <VStack flex={1} style={{ padding: 16 }}>
        <VStack space="lg">
          <VStack space="sm">
            <RNText style={[styles.title, { color: colors.text.primary }]}>
              Start New Chat
            </RNText>
            <RNText style={[styles.subtitle, { color: colors.text.secondary }]}>
              Enter the email address of the person you want to chat with
            </RNText>
          </VStack>

          <VStack space="md">
            <StyledInput
              placeholder="Enter user ID or email"
              value={participantEmail}
              onChangeText={setParticipantEmail}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error && (
              <RNText style={[styles.error, { color: colors.error }]}>
                {error}
              </RNText>
            )}

            <Button
              onPress={handleCreateChat}
              disabled={!participantEmail.trim() || loading}
            >
              <ButtonText>{loading ? 'Creating...' : 'Start Chat'}</ButtonText>
            </Button>
          </VStack>
        </VStack>

        <Box style={{ flex: 1 }} />

        <Button variant="outline" onPress={() => navigation.goBack()}>
          <ButtonText>Cancel</ButtonText>
        </Button>
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
});

export default NewChatScreen;
