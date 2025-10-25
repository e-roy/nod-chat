import React, { useState } from 'react';
import {
  ImagePlus,
  Camera,
  Send,
  Image as ImageIcon,
} from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
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
import { Text } from '@ui/text';
import {
  takePhoto,
  pickImage,
  uploadImage,
  UploadProgress,
} from '@/messaging/mediaUpload';

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
      <Box className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <HStack className="items-center gap-3" alignItems="center">
          {/* Attachment icons */}
          <HStack className="items-center gap-2" alignItems="center">
            <TouchableOpacity
              onPress={() => setShowImagePicker(true)}
              disabled={disabled}
            >
              <Box className="p-2 rounded-full">
                <ImagePlus
                  size={22}
                  color="#6B7280"
                  className="dark:text-neutral-400"
                />
              </Box>
            </TouchableOpacity>
          </HStack>

          {/* Message input */}
          <Input className="flex-1 bg-neutral-100 dark:bg-neutral-800 border-0">
            <InputField
              placeholder="Write a message"
              value={messageText}
              onChangeText={onMessageTextChange}
              multiline
              maxLength={1000}
              editable={!disabled}
              className="text-sm"
            />
          </Input>

          {/* Send button */}
          <TouchableOpacity
            onPress={onSendMessage}
            disabled={!messageText.trim() || disabled}
          >
            <Box
              className={`p-2 rounded-full ${
                messageText.trim() && !disabled
                  ? 'bg-blue-600 dark:bg-blue-700'
                  : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <Send
                size={20}
                color={messageText.trim() && !disabled ? '#ffffff' : '#9CA3AF'}
              />
            </Box>
          </TouchableOpacity>
        </HStack>
      </Box>

      {/* Upload Progress */}
      {uploadProgress && (
        <Box className="absolute bottom-24 left-4 right-4 bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-lg">
          <Text className="text-sm mb-2">
            Uploading image... {Math.round(uploadProgress.progress)}%
          </Text>
          <Box className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <Box
              className="h-full bg-blue-500"
              style={{ width: `${uploadProgress.progress}%` }}
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
            <HStack className="items-center gap-3" alignItems="center">
              <Camera size={20} />
              <ActionsheetItemText>Take Photo</ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
          <ActionsheetItem onPress={handlePickImage}>
            <HStack className="items-center gap-3" alignItems="center">
              <ImageIcon size={20} />
              <ActionsheetItemText>Choose from Library</ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
        </ActionsheetContent>
      </Actionsheet>
    </>
  );
};

export default MessageInput;
