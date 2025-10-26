import React, { useState, useEffect } from 'react';
import {
  Text as RNText,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ButtonText } from '@ui/button';
import { Alert, AlertText } from '@ui/alert';
import { Spinner } from '@ui/spinner';
import StyledInput from '@ui/StyledInput';

import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';

import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

// Helper function to convert Firebase error codes to user-friendly messages
const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address. Please check your email or sign up for a new account.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [authError, setAuthError] = useState('');
  const [displayNameError, setDisplayNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const { signUp, signIn, error, clearError } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

  // Clear all errors when switching between sign in/up
  const clearAllErrors = () => {
    setValidationError('');
    setAuthError('');
    clearError();
  };

  useEffect(() => {
    if (error) {
      // Error should now be a clean Firebase error code from the auth store
      const friendlyMessage = getErrorMessage(error);
      setAuthError(friendlyMessage);
      clearError();
    }
  }, [error, clearError]);

  const handleAuth = async () => {
    // Clear previous errors
    clearAllErrors();
    setDisplayNameError(false);
    setEmailError(false);
    setPasswordError(false);

    // Validate required fields
    let hasError = false;
    if (isSignUp && !displayName) {
      setDisplayNameError(true);
      hasError = true;
    }
    if (!email) {
      setEmailError(true);
      hasError = true;
    }
    if (!password) {
      setPasswordError(true);
      hasError = true;
    }

    if (hasError) {
      setValidationError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError(true);
      setValidationError('Please enter a valid email address');
      return;
    }

    // Password length validation
    if (password.length < 6) {
      setPasswordError(true);
      setValidationError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      await signUp(email, password, displayName);
    } else {
      await signIn(email, password);
    }

    setLoading(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <VStack space="sm" alignItems="center" style={{ marginBottom: 32 }}>
              <RNText style={[styles.appName, { color: colors.info }]}>
                MessageAI
              </RNText>
              <RNText style={[styles.title, { color: colors.text.primary }]}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </RNText>
              <RNText
                style={[styles.subtitle, { color: colors.text.secondary }]}
              >
                {isSignUp
                  ? 'Sign up to start chatting with friends'
                  : 'Sign in to continue chatting'}
              </RNText>
            </VStack>

            <VStack space="md">
              {/* Error Messages */}
              {validationError && (
                <Alert action="error" variant="outline">
                  <AlertText>{validationError}</AlertText>
                </Alert>
              )}

              {authError && (
                <Alert action="error" variant="outline">
                  <AlertText>{authError}</AlertText>
                </Alert>
              )}

              {/* Display Name Input */}
              {isSignUp && (
                <StyledInput
                  placeholder="Display Name"
                  value={displayName}
                  onChangeText={text => {
                    setDisplayName(text);
                    setDisplayNameError(false);
                    if (validationError) clearAllErrors();
                  }}
                  autoCapitalize="words"
                  editable={!loading}
                  style={
                    displayNameError ? { borderColor: colors.error } : undefined
                  }
                />
              )}

              {/* Email Input */}
              <StyledInput
                placeholder="Email"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  setEmailError(false);
                  if (validationError || authError) clearAllErrors();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={emailError ? { borderColor: colors.error } : undefined}
              />

              {/* Password Input */}
              <StyledInput
                placeholder="Password"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  setPasswordError(false);
                  if (validationError || authError) clearAllErrors();
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={
                  passwordError ? { borderColor: colors.error } : undefined
                }
              />

              {/* Submit Button */}
              <Button
                variant="solid"
                size="md"
                action="primary"
                onPress={handleAuth}
                disabled={loading}
                style={{ minHeight: 48 }}
              >
                {loading ? (
                  <HStack space="sm" alignItems="center">
                    <Spinner size="small" color="$white" />
                    <ButtonText>
                      {isSignUp ? 'Creating Account...' : 'Signing In...'}
                    </ButtonText>
                  </HStack>
                ) : (
                  <ButtonText>{isSignUp ? 'Sign Up' : 'Sign In'}</ButtonText>
                )}
              </Button>
            </VStack>

            <HStack
              space="sm"
              alignItems="center"
              justifyContent="center"
              style={{ marginTop: 24 }}
            >
              <RNText
                style={[styles.switchText, { color: colors.text.secondary }]}
              >
                {isSignUp
                  ? 'Already have an account?'
                  : "Don't have an account?"}
              </RNText>
              <Button
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setEmail('');
                  setPassword('');
                  setDisplayName('');
                  clearAllErrors();
                }}
                variant="link"
                disabled={loading}
                style={{ paddingHorizontal: 0 }}
              >
                <ButtonText
                  style={{
                    color: colors.info,
                    textDecorationLine: 'underline',
                  }}
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </ButtonText>
              </Button>
            </HStack>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  switchText: {
    fontSize: 16,
  },
});

export default AuthScreen;
