import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';

import { Button, ButtonText } from '@ui/button';
import { Input, InputField } from '@ui/input';
import { Text } from '@ui/text';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';

import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';

type NewChatScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'NewChat'
>;

const NewChatScreen: React.FC = () => {
  const navigation = useNavigation<NewChatScreenNavigationProp>();
  const { user, loading: authLoading } = useAuthStore();
  const { createChat, error, clearError } = useChatStore();
  const [participantEmail, setParticipantEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <VStack className="flex-1 justify-center items-center">
          <Text>Loading...</Text>
        </VStack>
      </SafeAreaView>
    );
  }

  // Show error if user is not authenticated
  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <VStack className="flex-1 justify-center items-center p-4">
          <Text className="text-lg text-red-500 dark:text-red-400 text-center mb-4">
            Not authenticated
          </Text>
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

      const chatId = await createChat([participantId]);

      if (chatId) {
        navigation.navigate('Chat', {
          chatId,
          participantName: participantEmail,
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
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <VStack className="flex-1 p-4">
        <VStack className="space-y-6">
          <VStack className="space-y-2">
            <Text className="text-xl font-bold">Start New Chat</Text>
            <Text className="text-sm text-neutral-600 dark:text-neutral-300">
              Enter the email address of the person you want to chat with
            </Text>
          </VStack>

          <VStack className="space-y-4">
            <Input>
              <InputField
                placeholder="Enter user ID or email"
                value={participantEmail}
                onChangeText={setParticipantEmail}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Input>

            {error && (
              <Text className="text-red-500 dark:text-red-400 text-sm text-center">
                {error}
              </Text>
            )}

            <Button
              onPress={handleCreateChat}
              disabled={!participantEmail.trim() || loading}
            >
              <ButtonText>{loading ? 'Creating...' : 'Start Chat'}</ButtonText>
            </Button>
          </VStack>
        </VStack>

        <Box className="flex-1" />

        <Button variant="outline" onPress={() => navigation.goBack()}>
          <ButtonText>Cancel</ButtonText>
        </Button>
      </VStack>
    </SafeAreaView>
  );
};

export default NewChatScreen;
