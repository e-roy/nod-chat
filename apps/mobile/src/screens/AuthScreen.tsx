import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input, InputField } from '@ui/input';
import { useToast, Toast, ToastTitle, ToastDescription } from '@ui/toast';
import { Button, ButtonText } from '@ui/button';
import { Alert, AlertText } from '@ui/alert';
import { Text } from '@ui/text';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';

import { useAuthStore } from '@/store/auth';

const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const { signUp, signIn, error, clearError } = useAuthStore();
  const toast = useToast();

  useEffect(() => {
    if (error) {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} action="error">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>{error}</ToastDescription>
          </Toast>
        ),
      });
      clearError();
    }
  }, [error, toast, clearError]);

  const handleAuth = async () => {
    if (!email || !password) {
      setValidationError('Please fill in all fields');
      return;
    }

    if (isSignUp && !displayName) {
      setValidationError('Please enter your display name');
      return;
    }

    try {
      setLoading(true);
      setValidationError('');
      clearError();

      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} action="error">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>{err.message}</ToastDescription>
          </Toast>
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <VStack className="flex-1 justify-center px-6 space-y-6">
        <VStack className="items-center space-y-2">
          <Text className="text-3xl font-bold text-center">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text className="text-base text-center text-neutral-600 dark:text-neutral-300">
            {isSignUp
              ? 'Sign up to start chatting with friends'
              : 'Sign in to continue chatting'}
          </Text>
        </VStack>

        <VStack className="space-y-4">
          {validationError && (
            <Alert action="error" variant="outline">
              <AlertText>{validationError}</AlertText>
            </Alert>
          )}

          {isSignUp && (
            <Input>
              <InputField
                placeholder="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </Input>
          )}

          <Input>
            <InputField
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Input>

          <Input>
            <InputField
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Input>

          <Button
            variant="solid"
            size="md"
            action="primary"
            onPress={handleAuth}
            disabled={loading}
          >
            <ButtonText>{isSignUp ? 'Sign Up' : 'Sign In'}</ButtonText>
          </Button>
        </VStack>

        <HStack className="justify-center items-center space-x-2">
          <Text className="text-base text-neutral-600 dark:text-neutral-300">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </Text>
          <Button
            onPress={() => {
              setIsSignUp(!isSignUp);
              setEmail('');
              setPassword('');
              setDisplayName('');
              clearError();
            }}
            variant="link"
          >
            <ButtonText>{isSignUp ? 'Sign In' : 'Sign Up'}</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </SafeAreaView>
  );
};

export default AuthScreen;
