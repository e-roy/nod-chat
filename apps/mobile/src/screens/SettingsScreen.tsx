import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ButtonText } from '@ui/button';
import { Switch } from '@ui/switch';
import { HStack } from '@ui/hstack';
import { VStack } from '@ui/vstack';
import { Box } from '@ui/box';
import { Moon, Sun } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

const SettingsScreen: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { isDark, toggleTheme, initializeTheme } = useThemeStore();
  const colors = getColors(isDark);

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Box style={styles.header}>
          <RNText
            style={[
              styles.title,
              { color: isDark ? colors.success : colors.error },
            ]}
          >
            Settings {isDark ? '(DARK)' : '(LIGHT)'}
          </RNText>
          <RNText style={[styles.subtitle, { color: colors.text.secondary }]}>
            Theme colors now work reliably!
          </RNText>
        </Box>

        <VStack space="lg">
          <VStack space="sm">
            <RNText
              style={[styles.sectionTitle, { color: colors.text.primary }]}
            >
              Profile
            </RNText>
            <RNText style={[styles.text, { color: colors.text.secondary }]}>
              Name: {user?.displayName || 'Not set'}
            </RNText>
            <RNText style={[styles.text, { color: colors.text.secondary }]}>
              Email: {user?.email}
            </RNText>
          </VStack>

          <VStack space="sm">
            <RNText
              style={[styles.sectionTitle, { color: colors.text.primary }]}
            >
              Appearance
            </RNText>
            <Box
              style={[
                styles.settingCard,
                { backgroundColor: colors.bg.secondary },
              ]}
            >
              <HStack space="md" alignItems="center">
                {isDark ? (
                  <Moon size={20} color={colors.text.secondary} />
                ) : (
                  <Sun size={20} color={colors.text.secondary} />
                )}
                <VStack flex={1}>
                  <RNText
                    style={[styles.cardTitle, { color: colors.text.primary }]}
                  >
                    Dark Mode
                  </RNText>
                  <RNText
                    style={[
                      styles.cardSubtitle,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Switch between light and dark themes
                  </RNText>
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
            <RNText
              style={[styles.sectionTitle, { color: colors.text.primary }]}
            >
              Account
            </RNText>
            <Button onPress={handleSignOut} variant="outline">
              <ButtonText>Sign Out</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  text: {
    fontSize: 16,
  },
  settingCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
});

export default SettingsScreen;
