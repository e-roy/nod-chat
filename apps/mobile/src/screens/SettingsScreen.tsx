import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ButtonText } from '@ui/button';
import { Switch } from '@ui/switch';
import { HStack } from '@ui/hstack';
import { VStack } from '@ui/vstack';
import { Text } from '@ui/text';
import { Box } from '@ui/box';
import { Moon, Sun } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';

const SettingsScreen: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { isDark, toggleTheme, initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleThemeToggle = async () => {
    try {
      await toggleTheme();
    } catch (error) {
      console.error('Theme toggle error:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <ScrollView className="flex-1 px-6 pt-4">
        <Box className="mb-6">
          <Text className="text-3xl font-bold">Settings</Text>
        </Box>

        <VStack space="lg">
          <VStack space="sm">
            <Text className="text-lg font-semibold">Profile</Text>
            <Text className="text-base">
              Name: {user?.displayName || 'Not set'}
            </Text>
            <Text className="text-base">Email: {user?.email}</Text>
          </VStack>

          <VStack space="sm">
            <Text className="text-lg font-semibold">Appearance</Text>
            <Box className="py-3 px-4 rounded-xl my-1">
              <HStack space="md" alignItems="center">
                {isDark ? (
                  <Moon size={20} color={isDark ? '#a3a3a3' : '#737373'} />
                ) : (
                  <Sun size={20} color={isDark ? '#a3a3a3' : '#737373'} />
                )}
                <VStack flex={1}>
                  <Text className="text-base font-medium">Dark Mode</Text>
                  <Text className="text-sm  mt-0.5">
                    Switch between light and dark themes
                  </Text>
                </VStack>
                <Switch
                  value={isDark}
                  onValueChange={handleThemeToggle}
                  accessibilityLabel="Toggle dark mode"
                />
              </HStack>
            </Box>
          </VStack>

          <VStack space="sm">
            <Text className="text-lg font-semibold">Account</Text>
            <Button onPress={handleSignOut} variant="outline">
              <ButtonText>Sign Out</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
