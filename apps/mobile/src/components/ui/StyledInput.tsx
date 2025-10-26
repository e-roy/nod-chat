import React, { useState } from 'react';
import { ViewStyle, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Mic } from 'lucide-react-native';
import { Input, InputField } from '@ui/input';
import { Box } from '@ui/box';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';

interface StyledInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  enableDynamicHeight?: boolean;
  minHeight?: number;
  maxHeight?: number;
  editable?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad'
    | 'number-pad'
    | 'decimal-pad'
    | 'url'
    | 'web-search';
  onSubmitEditing?: () => void;
  placeholderTextColor?: string;
  style?: ViewStyle;
  numberOfLines?: number;
  enableSpeechToText?: boolean;
  onSpeechToTextResult?: (text: string) => void;
  isProcessingSpeech?: boolean;
}

const StyledInput: React.FC<StyledInputProps> = ({
  value,
  onChangeText,
  placeholder = '',
  multiline = false,
  enableDynamicHeight = false,
  minHeight = 48,
  maxHeight = 120,
  editable = true,
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  keyboardType = 'default',
  onSubmitEditing,
  placeholderTextColor,
  style,
  numberOfLines,
  enableSpeechToText = false,
  onSpeechToTextResult,
  isProcessingSpeech = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

  // Use parent processing state
  const isProcessing = isProcessingSpeech;

  // Calculate input height based on content
  const calculateInputHeight = () => {
    if (!value || !enableDynamicHeight) return minHeight;

    // Count actual line breaks
    const explicitLines = value.split('\n').length;

    // Estimate character wrapping (assuming ~30 characters per line on mobile)
    const estimatedWrappedLines = Math.ceil(value.length / 30);

    // Use the maximum of explicit lines and wrapped lines
    const totalLines = Math.max(explicitLines, estimatedWrappedLines);

    const baseHeight = minHeight;
    const lineHeight = 22; // Approximate line height

    const calculatedHeight = baseHeight + (totalLines - 1) * lineHeight;

    return Math.min(Math.max(calculatedHeight, minHeight), maxHeight);
  };

  const inputHeight = calculateInputHeight();

  // Determine border color - prioritize error style, then focus, then default
  const borderColor = style?.borderColor
    ? style.borderColor
    : isFocused
      ? colors.info
      : colors.border.muted;

  const handleMicPress = async () => {
    if (isProcessing) return;

    if (isRecording) {
      // Stop recording and process
      setIsRecording(false);

      if (onSpeechToTextResult) {
        // Trigger the callback for parent to handle
        await onSpeechToTextResult('');
      }
    } else {
      // Start recording
      setIsRecording(true);

      if (onSpeechToTextResult) {
        // Trigger the callback to start recording
        await onSpeechToTextResult('recording');
      }
    }
  };

  // Show microphone button only when input is empty and speech-to-text is enabled
  const showMicButton = enableSpeechToText && value === '';

  return (
    <Box style={{ position: 'relative', flex: 1 }}>
      <Input
        style={{
          backgroundColor: colors.bg.secondary,
          borderRadius: 24,
          borderWidth: isFocused && !style?.borderColor ? 2 : 1,
          borderColor: borderColor,
          height: multiline && enableDynamicHeight ? inputHeight : minHeight,
          maxHeight: maxHeight,
          shadowColor: isFocused ? colors.info : colors.bg.primary,
          shadowOffset: {
            width: 0,
            height: isFocused ? 2 : 0,
          },
          shadowOpacity: isFocused ? 0.1 : 0,
          shadowRadius: isFocused ? 4 : 0,
          elevation: isFocused ? 2 : 0,
          overflow: 'visible',
          ...style,
        }}
      >
        <InputField
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || colors.text.muted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          maxLength={1000}
          editable={editable}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          onSubmitEditing={onSubmitEditing}
          numberOfLines={numberOfLines}
          style={{
            fontSize: 16,
            color: colors.text.primary,
            paddingTop: multiline ? 12 : 4,
            paddingRight: showMicButton ? 48 : 16,
            paddingLeft: 16,
            paddingVertical: 12,
            textAlignVertical: multiline ? 'top' : 'center',
            height: '100%',
          }}
        />
      </Input>

      {showMicButton && (
        <TouchableOpacity
          onPress={handleMicPress}
          disabled={isProcessing}
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: [{ translateY: -18 }],
            padding: 8,
            zIndex: 1000,
          }}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.text.secondary} />
          ) : (
            <Mic
              size={20}
              color={isRecording ? '#ef4444' : colors.text.secondary}
            />
          )}
        </TouchableOpacity>
      )}
    </Box>
  );
};

export default StyledInput;
