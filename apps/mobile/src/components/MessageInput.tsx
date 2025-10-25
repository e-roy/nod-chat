import React, { useState } from 'react';
import {
  ImagePlus,
  Camera,
  Send,
  Image as ImageIcon,
} from 'lucide-react-native';
import { TouchableOpacity, Text as RNText, StyleSheet } from 'react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicatorWrapper,
  ActionsheetDragIndicator,
  ActionsheetItem,
  ActionsheetItemText,
} from '@ui/actionsheet';
import { Input, InputField } from '@ui/input';
import { HStack } from '@ui/hstack';
import { Box } from '@ui/box';
import {
  takePhoto,
  pickImage,
  uploadImage,
  UploadProgress,
} from '@/messaging/mediaUpload';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

interface MessageInputProps {
  chatId: string;
  messageText: string;
  onMessageTextChange: (text: string) => void;
  onSendMessage: () => void;
  onImageUpload: (imageUrl: string) => Promise<void>;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  chatId,
  messageText,
  onMessageTextChange,
  onSendMessage,
  onImageUpload,
  disabled = false,
}) => {
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

  const handleImageUpload = async (imageUri: string) => {
    try {
      setUploadProgress({ bytesTransferred: 0, totalBytes: 100, progress: 0 });

      // Upload image to Firebase Storage
      const imageUrl = await uploadImage(chatId, imageUri, progress => {
        setUploadProgress(progress);
      });

      // Call the parent's image upload handler
      await onImageUpload(imageUrl);

      setUploadProgress(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadProgress(null);
    }
  };

  const handleTakePhoto = async () => {
    setShowImagePicker(false);
    const uri = await takePhoto();
    if (uri) {
      await handleImageUpload(uri);
    }
  };

  const handlePickImage = async () => {
    setShowImagePicker(false);
    const uri = await pickImage();
    if (uri) {
      await handleImageUpload(uri);
    }
  };

  return (
    <>
      <Box
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.bg.primary,
          borderTopWidth: 1,
          borderTopColor: colors.border.default,
        }}
      >
        <HStack space="md" alignItems="center">
          {/* Attachment icons */}
          <HStack space="sm" alignItems="center">
            <TouchableOpacity
              onPress={() => setShowImagePicker(true)}
              disabled={disabled}
            >
              <Box style={{ padding: 8, borderRadius: 20 }}>
                <Box>
                  <ImagePlus size={22} color={colors.text.secondary} />
                </Box>
              </Box>
            </TouchableOpacity>
          </HStack>

          {/* Message input */}
          <Input style={{ flex: 1, backgroundColor: colors.bg.secondary }}>
            <InputField
              placeholder="Write a message"
              value={messageText}
              onChangeText={onMessageTextChange}
              multiline
              maxLength={1000}
              editable={!disabled}
              style={{ fontSize: 14 }}
            />
          </Input>

          {/* Send button */}
          <TouchableOpacity
            onPress={onSendMessage}
            disabled={!messageText.trim() || disabled}
          >
            <Box
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor:
                  messageText.trim() && !disabled
                    ? isDark
                      ? '#1d4ed8'
                      : '#2563eb'
                    : colors.bg.secondary,
              }}
            >
              <Box>
                <Send
                  size={20}
                  color={
                    messageText.trim() && !disabled
                      ? '#ffffff'
                      : colors.text.muted
                  }
                />
              </Box>
            </Box>
          </TouchableOpacity>
        </HStack>
      </Box>

      {/* Upload Progress */}
      {uploadProgress && (
        <Box
          style={{
            position: 'absolute',
            bottom: 96,
            left: 16,
            right: 16,
            padding: 16,
            borderRadius: 8,
            backgroundColor: colors.bg.secondary,
          }}
        >
          <RNText
            style={[
              styles.progressText,
              { color: colors.text.primary, marginBottom: 8 },
            ]}
          >
            Uploading image... {Math.round(uploadProgress.progress)}%
          </RNText>
          <Box
            style={{
              height: 8,
              borderRadius: 4,
              overflow: 'hidden',
              backgroundColor: colors.bg.muted,
            }}
          >
            <Box
              style={{
                height: '100%',
                backgroundColor: '#3b82f6',
                width: `${uploadProgress.progress}%`,
              }}
            />
          </Box>
        </Box>
      )}

      {/* Image Picker Actionsheet */}
      <Actionsheet
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
      >
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <ActionsheetItem onPress={handleTakePhoto}>
            <HStack space="md" alignItems="center">
              <Box>
                <Camera size={20} />
              </Box>
              <ActionsheetItemText>Take Photo</ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
          <ActionsheetItem onPress={handlePickImage}>
            <HStack space="md" alignItems="center">
              <Box>
                <ImageIcon size={20} />
              </Box>
              <ActionsheetItemText>Choose from Library</ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
        </ActionsheetContent>
      </Actionsheet>
    </>
  );
};

const styles = StyleSheet.create({
  progressText: {
    fontSize: 14,
  },
});

export default MessageInput;
