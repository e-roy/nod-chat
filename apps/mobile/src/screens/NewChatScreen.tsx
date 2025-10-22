import React, { useState } from 'react';
import { View, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Button, ButtonText } from '@ui/button';
import { Input, InputField } from '@ui/input';
import { useChatStore } from '../store/chat';
import { useAuthStore } from '../store/auth';

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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <RNText>Loading...</RNText>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if user is not authenticated
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <RNText
            style={{
              fontSize: 18,
              color: '#ef4444',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Not authenticated
          </RNText>
          <Button onPress={() => navigation.goBack()}>
            <ButtonText>Go Back</ButtonText>
          </Button>
        </View>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ gap: 24 }}>
          <View style={{ gap: 8 }}>
            <RNText style={{ fontSize: 20, fontWeight: 'bold' }}>
              Start New Chat
            </RNText>
            <RNText style={{ fontSize: 14, color: '#666' }}>
              Enter the email address of the person you want to chat with
            </RNText>
          </View>

          <View style={{ gap: 16 }}>
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
              <RNText
                style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}
              >
                {error}
              </RNText>
            )}

            <Button
              onPress={handleCreateChat}
              disabled={!participantEmail.trim() || loading}
            >
              <ButtonText>{loading ? 'Creating...' : 'Start Chat'}</ButtonText>
            </Button>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <Button variant="outline" onPress={() => navigation.goBack()}>
          <ButtonText>Cancel</ButtonText>
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default NewChatScreen;
