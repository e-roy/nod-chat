import React, { useState, useEffect } from 'react';
import {
  ImagePlus,
  Camera,
  Send,
  Image as ImageIcon,
} from 'lucide-react-native';
import {
  TouchableOpacity,
  Text as RNText,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
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
  const [isFocused, setIsFocused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

  // Track keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Calculate input height based on content
  const calculateInputHeight = () => {
    if (!messageText) return 48; // Default height

    // Count actual line breaks
    const explicitLines = messageText.split('\n').length;

    // Estimate character wrapping (assuming ~30 characters per line on mobile)
    const estimatedWrappedLines = Math.ceil(messageText.length / 30);

    // Use the maximum of explicit lines and wrapped lines
    const totalLines = Math.max(explicitLines, estimatedWrappedLines);

    const baseHeight = 48;
    const lineHeight = 22; // Approximate line height

    const calculatedHeight = baseHeight + (totalLines - 1) * lineHeight;
    const minHeight = 48;
    const maxHeight = 120;

    return Math.min(Math.max(calculatedHeight, minHeight), maxHeight);
  };

  const inputHeight = calculateInputHeight();

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
          paddingTop: 8,
          paddingBottom: isKeyboardVisible
            ? Platform.OS === 'ios'
              ? 4
              : 8
            : Platform.OS === 'ios'
              ? 16
              : 24,
          backgroundColor: colors.bg.primary,
          borderTopWidth: 1,
          borderTopColor: colors.border.default,
        }}
      >
        <HStack space="sm" alignItems="end">
          {/* Attachment icons */}
          <HStack space="sm" alignItems="center">
            <TouchableOpacity
              onPress={() => setShowImagePicker(true)}
              disabled={disabled}
              style={{
                marginRight: 4,
              }}
            >
              <Box
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.bg.secondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border.muted,
                }}
              >
                <ImagePlus size={22} color={colors.text.secondary} />
              </Box>
            </TouchableOpacity>
          </HStack>

          {/* Message input */}
          <Input
            style={{
              flex: 1,
              backgroundColor: colors.bg.secondary,
              borderRadius: 24,
              borderWidth: isFocused ? 2 : 1,
              borderColor: isFocused ? colors.info : colors.border.muted,
              height: inputHeight,
              maxHeight: 120,
              shadowColor: isFocused ? colors.info : colors.bg.primary,
              shadowOffset: {
                width: 0,
                height: isFocused ? 2 : 0,
              },
              shadowOpacity: isFocused ? 0.1 : 0,
              shadowRadius: isFocused ? 4 : 0,
              elevation: isFocused ? 2 : 0,
            }}
          >
            <InputField
              placeholder=""
              placeholderTextColor={colors.text.muted}
              value={messageText}
              onChangeText={onMessageTextChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              multiline
              maxLength={1000}
              editable={!disabled}
              style={{
                fontSize: 16,
                color: colors.text.primary,
                paddingTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                textAlignVertical: 'top',
                height: '100%',
              }}
            />
          </Input>

          {/* Send button */}
          <TouchableOpacity
            onPress={onSendMessage}
            disabled={!messageText.trim() || disabled}
            style={{
              marginLeft: 4,
            }}
          >
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor:
                  messageText.trim() && !disabled
                    ? isDark
                      ? '#1d4ed8'
                      : '#2563eb'
                    : colors.bg.muted,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border.muted,
              }}
            >
              <Send
                size={20}
                color={
                  messageText.trim() && !disabled
                    ? '#ffffff'
                    : colors.text.muted
                }
              />
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
              // eslint-disable-next-line react-native/no-color-literals
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
        <ActionsheetContent
          style={{
            backgroundColor: colors.bg.secondary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator
              style={{ backgroundColor: colors.border.default }}
            />
          </ActionsheetDragIndicatorWrapper>
          <ActionsheetItem
            onPress={handleTakePhoto}
            style={{
              backgroundColor: colors.bg.secondary,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.muted,
            }}
          >
            <HStack space="md" alignItems="center">
              <Box>
                <Camera size={20} color={colors.text.primary} />
              </Box>
              <ActionsheetItemText
                style={{ color: colors.text.primary, fontSize: 16 }}
              >
                Take Photo
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
          <ActionsheetItem
            onPress={handlePickImage}
            style={{
              backgroundColor: colors.bg.secondary,
            }}
          >
            <HStack space="md" alignItems="center">
              <Box>
                <ImageIcon size={20} color={colors.text.primary} />
              </Box>
              <ActionsheetItemText
                style={{ color: colors.text.primary, fontSize: 16 }}
              >
                Choose from Library
              </ActionsheetItemText>
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
