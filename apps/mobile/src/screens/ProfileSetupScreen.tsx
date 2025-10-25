import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ButtonText, ButtonSpinner } from '@ui/button';
import { Input, InputField } from '@ui/input';
import { Alert, AlertText } from '@ui/alert';
import { Text } from '@ui/text';
import { VStack } from '@ui/vstack';

import { useAuthStore } from '@/store/auth';

const ProfileSetupScreen: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const { updateProfile } = useAuthStore();

  const handleCompleteProfile = async () => {
    if (!displayName.trim()) {
      setValidationError('Please enter your display name');
      return;
    }

    try {
      setLoading(true);
      setValidationError('');
      await updateProfile({ displayName: displayName.trim() });
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      setValidationError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <VStack className="flex-1 px-6 pt-4">
        <VStack className="mb-6 space-y-2">
          <Text className="text-3xl font-bold">Complete Your Profile</Text>
          <Text className="text-base text-neutral-600 dark:text-neutral-300">
            Let's set up your profile to get started
          </Text>
        </VStack>

        <VStack className="flex-1 space-y-6">
          {validationError && (
            <Alert action="error" variant="outline">
              <AlertText>{validationError}</AlertText>
            </Alert>
          )}

          <VStack className="space-y-2">
            <Text className="text-base font-semibold">Display Name</Text>
            <Input>
              <InputField
                placeholder="Enter your display name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </Input>
          </VStack>

          <VStack className="flex-1 justify-end space-y-4">
            <Button onPress={handleCompleteProfile} isDisabled={loading}>
              {loading ? (
                <ButtonSpinner />
              ) : (
                <ButtonText>Complete Profile</ButtonText>
              )}
            </Button>
          </VStack>
        </VStack>
      </VStack>
    </SafeAreaView>
  );
};

export default ProfileSetupScreen;
