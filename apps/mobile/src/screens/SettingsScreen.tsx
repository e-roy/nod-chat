import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ButtonText } from '@ui/button';
import { Switch } from '@ui/switch';
import { HStack } from '@ui/hstack';
import { VStack } from '@ui/vstack';
import { Box } from '@ui/box';
import { Avatar, AvatarImage, AvatarFallbackText } from '@ui/avatar';
import { ChevronRight, Moon, Sun } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';

type SettingsScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const SettingItem = ({
  icon: Icon,
  title,
  subtitle,
  onPress,
  rightElement,
  colors,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  colors: {
    bg: { secondary: string };
    text: { primary: string; secondary: string };
  };
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.settingItem, { backgroundColor: colors.bg.secondary }]}
    disabled={!onPress}
  >
    <HStack space="md" alignItems="center">
      <Box>
        <Icon size={20} color={colors.text.secondary} />
      </Box>
      <VStack flex={1}>
        <RNText style={[styles.itemTitle, { color: colors.text.primary }]}>
          {title}
        </RNText>
        {subtitle && (
          <RNText
            style={[styles.itemSubtitle, { color: colors.text.secondary }]}
          >
            {subtitle}
          </RNText>
        )}
      </VStack>
      {rightElement ||
        (onPress && (
          <Box>
            <ChevronRight size={20} color={colors.text.secondary} />
          </Box>
        ))}
    </HStack>
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { isDark, toggleTheme, initializeTheme } = useThemeStore();
  const colors = getColors(isDark);
  const navigation = useNavigation<SettingsScreenNavigationProp>();

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

  const navigateToProfileEdit = () => {
    navigation.navigate('ProfileEdit');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      edges={['left', 'right']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Profile Section */}
        <TouchableOpacity onPress={navigateToProfileEdit}>
          <Box
            style={[
              styles.profileCard,
              { backgroundColor: colors.bg.secondary },
            ]}
          >
            <HStack space="md" alignItems="center">
              <Avatar size="lg">
                <AvatarImage source={{ uri: user?.photoURL }} />
                {!user?.photoURL && (
                  <AvatarFallbackText>
                    {user?.displayName || user?.email || 'User'}
                  </AvatarFallbackText>
                )}
              </Avatar>
              <VStack flex={1}>
                <RNText
                  style={[styles.profileName, { color: colors.text.primary }]}
                >
                  {user?.displayName || 'Eric F'}
                </RNText>
                <RNText
                  style={[
                    styles.profileStatus,
                    { color: colors.text.secondary },
                  ]}
                >
                  {(user as { statusMessage?: string })?.statusMessage ||
                    'Hey there! I am using MessageAI...'}
                </RNText>
              </VStack>
              <Box>
                <ChevronRight size={20} color={colors.text.secondary} />
              </Box>
            </HStack>
          </Box>
        </TouchableOpacity>

        {/* General Features Section */}
        <VStack space="sm" style={styles.section}>
          <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
            General Features
          </RNText>
          <Box
            style={[
              styles.sectionCard,
              { backgroundColor: colors.bg.secondary },
            ]}
          >
            <VStack space="xs"></VStack>
          </Box>
        </VStack>

        {/* Account and Privacy Section */}
        <VStack space="sm" style={styles.section}>
          <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Account and Privacy
          </RNText>
          <Box
            style={[
              styles.sectionCard,
              { backgroundColor: colors.bg.secondary },
            ]}
          >
            <VStack space="xs"></VStack>
          </Box>
        </VStack>

        {/* Appearance Section */}
        <VStack space="sm" style={styles.section}>
          <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Appearance
          </RNText>
          <Box
            style={[
              styles.sectionCard,
              { backgroundColor: colors.bg.secondary },
            ]}
          >
            <SettingItem
              icon={isDark ? Moon : Sun}
              title="Dark Mode"
              subtitle="Switch between light and dark themes"
              colors={colors}
              rightElement={
                <Switch
                  value={isDark}
                  onValueChange={handleThemeToggle}
                  accessibilityLabel="Toggle dark mode"
                />
              }
            />
          </Box>
        </VStack>

        {/* Sign Out Button */}
        <Button
          onPress={handleSignOut}
          variant="outline"
          style={styles.signOutButton}
        >
          <ButtonText>Sign Out</ButtonText>
        </Button>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  profileCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileStatus: {
    fontSize: 14,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionCard: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  settingItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  signOutButton: {
    marginTop: 32,
    marginHorizontal: 16,
  },
});

export default SettingsScreen;
