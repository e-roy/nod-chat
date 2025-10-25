import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text as RNText, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ButtonText } from '@ui/button';
import { Input, InputField } from '@ui/input';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { Box } from '@ui/box';
import { Avatar, AvatarImage, AvatarFallbackText } from '@ui/avatar';
import { Camera } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { uploadAvatar, deleteOldAvatar } from '@/messaging/mediaUpload';
import { useNavigation } from '@react-navigation/native';

const ProfileEditScreen: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const navigation = useNavigation();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [statusMessage, setStatusMessage] = useState(
    'Hey there! I am using MessageAI.'
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
    if (user?.statusMessage) {
      setStatusMessage(user.statusMessage);
    }
  }, [user]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim() || undefined,
      });
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    try {
      setLoading(true);

      // Store the old photo URL for cleanup
      const oldPhotoURL = user?.photoURL;

      // Upload new avatar
      const photoURL = await uploadAvatar(user?.uid || '');
      if (photoURL) {
        // Update profile with new photo URL
        await updateProfile({ photoURL });

        // Clean up old avatar (don't block on this)
        if (oldPhotoURL) {
          deleteOldAvatar(oldPhotoURL).catch(error => {
            console.warn('Failed to delete old avatar:', error);
          });
        }

        Alert.alert('Success', 'Avatar updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <VStack space="lg">
          {/* Avatar Section */}
          <Box style={styles.avatarSection}>
            <Avatar size="2xl">
              <AvatarImage source={{ uri: user?.photoURL }} />
              {!user?.photoURL && (
                <AvatarFallbackText>
                  {user?.displayName || user?.email || 'User'}
                </AvatarFallbackText>
              )}
            </Avatar>
            <Button
              variant="outline"
              size="sm"
              onPress={handleAvatarUpload}
              style={styles.avatarButton}
            >
              <HStack space="sm" alignItems="center">
                <Camera size={16} color={colors.text.primary} />
                <ButtonText style={{ color: colors.text.primary }}>
                  Change Avatar
                </ButtonText>
              </HStack>
            </Button>
          </Box>

          {/* Profile Fields */}
          <VStack space="md">
            <VStack space="sm">
              <RNText style={[styles.label, { color: colors.text.primary }]}>
                Display Name
              </RNText>
              <Input>
                <InputField
                  placeholder="Enter your name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={{ color: colors.text.primary }}
                />
              </Input>
            </VStack>

            <VStack space="sm">
              <RNText style={[styles.label, { color: colors.text.primary }]}>
                Status Message
              </RNText>
              <Input>
                <InputField
                  placeholder="Enter your status message"
                  value={statusMessage}
                  onChangeText={setStatusMessage}
                  style={{ color: colors.text.primary }}
                  multiline
                  numberOfLines={3}
                />
              </Input>
            </VStack>
          </VStack>

          {/* Save Button */}
          <Button
            onPress={handleSave}
            disabled={loading}
            style={styles.saveButton}
          >
            <ButtonText>{loading ? 'Saving...' : 'Save Changes'}</ButtonText>
          </Button>
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
    paddingTop: 8,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarButton: {
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    marginTop: 24,
  },
});

export default ProfileEditScreen;
