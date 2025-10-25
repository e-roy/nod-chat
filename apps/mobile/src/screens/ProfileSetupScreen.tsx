import React, { useState } from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ButtonText, ButtonSpinner } from '@ui/button';
import { Input, InputField } from '@ui/input';
import { Alert, AlertText } from '@ui/alert';
import { VStack } from '@ui/vstack';

import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

const ProfileSetupScreen: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const { updateProfile } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
    >
      <VStack className="flex-1 px-6 pt-4">
        <VStack className="mb-6 space-y-2">
          <RNText style={[styles.title, { color: colors.text.primary }]}>
            Complete Your Profile
          </RNText>
          <RNText style={[styles.subtitle, { color: colors.text.secondary }]}>
            Let's set up your profile to get started
          </RNText>
        </VStack>

        <VStack className="flex-1 space-y-6">
          {validationError && (
            <Alert action="error" variant="outline">
              <AlertText>{validationError}</AlertText>
            </Alert>
          )}

          <VStack className="space-y-2">
            <RNText style={[styles.label, { color: colors.text.primary }]}>
              Display Name
            </RNText>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileSetupScreen;
