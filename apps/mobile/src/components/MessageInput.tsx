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
import { HStack } from '@ui/hstack';
import { Box } from '@ui/box';
import StyledInput from '@ui/StyledInput';
import {
  takePhoto,
  pickImage,
  uploadImage,
  UploadProgress,
} from '@/messaging/mediaUpload';
import {
  startRecording,
  stopRecording,
  cleanupRecording,
  getAudioBlob,
} from '@/messaging/audioRecording';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/firebaseApp';

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        cleanupRecording();
      }
    };
  }, [isRecording]);

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

  const handleSpeechToTextResult = async (action: string) => {
    try {
      if (action === 'recording') {
        // Start recording
        await startRecording();
        setIsRecording(true);
      } else if (isRecording) {
        // Stop recording and process - don't change state yet
        setIsProcessingSpeech(true);

        const audioUri = await stopRecording();
        setIsRecording(false);

        if (!audioUri) {
          setIsProcessingSpeech(false);
          return;
        }

        // Convert audio to base64
        const blob = await getAudioBlob(audioUri);
        const base64Audio = await blobToBase64(blob);

        // Call Firebase Function to transcribe with base64 data
        const transcribeAudioFunction = httpsCallable(
          functions,
          'transcribeAudio'
        );
        const result = await transcribeAudioFunction({
          audioData: base64Audio,
        });

        const transcribedText = (result.data as { text: string }).text;
        if (transcribedText) {
          onMessageTextChange(transcribedText);
        }

        setIsProcessingSpeech(false);
      }
    } catch (error) {
      console.error('Error in speech-to-text:', error);
      setIsRecording(false);
      setIsProcessingSpeech(false);
      // Clean up any dangling recording
      cleanupRecording();
    }
  };

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1]; // Remove data:audio/m4a;base64, prefix
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.readAsDataURL(blob);
    });
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
          <StyledInput
            value={messageText}
            onChangeText={onMessageTextChange}
            placeholder=""
            multiline
            enableDynamicHeight
            minHeight={48}
            maxHeight={120}
            editable={!disabled}
            style={{ flex: 1 }}
            enableSpeechToText
            onSpeechToTextResult={handleSpeechToTextResult}
            isProcessingSpeech={isProcessingSpeech}
          />

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
            {isProcessingSpeech
              ? 'Transcribing audio...'
              : `Uploading image... ${Math.round(uploadProgress.progress)}%`}
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
