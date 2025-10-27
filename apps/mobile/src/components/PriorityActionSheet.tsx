import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@ui/actionsheet';

import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { useAIStore } from '@/store/ai';
import { useChatStore } from '@/store/chat';
import { PriorityList } from './PriorityList';

interface PriorityActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  onMessagePress?: (messageId: string) => void;
}

export const PriorityActionSheet: React.FC<PriorityActionSheetProps> = ({
  isOpen,
  onClose,
  chatId,
  onMessagePress,
}) => {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const { chatPriorities, loadPriorities } = useAIStore();
  const { scrollToMessage } = useChatStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const priorities = chatPriorities.get(chatId);
  const sortedPriorities = priorities?.priorities
    ? [...priorities.priorities].sort((a, b) => {
        // First sort by level: urgent comes before high
        if (a.level !== b.level) {
          return a.level === 'urgent' ? -1 : 1;
        }
        // Then sort by timestamp: most recent first
        return b.timestamp - a.timestamp;
      })
    : [];

  const handleMessagePress = async (
    messageId: string,
    level: 'high' | 'urgent'
  ) => {
    // Close the sheet first
    onClose();

    // Wait a moment for the sheet to close
    await new Promise(resolve => setTimeout(resolve, 300));

    // Scroll to the message with the appropriate highlight type
    const highlightType =
      level === 'urgent' ? 'priority-urgent' : 'priority-high';
    try {
      await scrollToMessage(chatId, messageId, highlightType);
    } catch (err) {
      console.error('Error scrolling to message:', err);
    }

    // Call the callback if provided (for additional parent logic)
    onMessagePress?.(messageId);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Reload priorities from Firestore
      loadPriorities(chatId);
      // Give it a moment to load
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error refreshing priorities:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent style={{ backgroundColor: colors.bg.primary }}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <VStack space="md" style={styles.container}>
          <HStack
            space="sm"
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <RNText style={[styles.title, { color: colors.text.primary }]}>
              Priority Messages
            </RNText>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={isRefreshing}
              accessibilityLabel="Refresh priorities"
              accessibilityRole="button"
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={colors.text.secondary} />
              ) : (
                <RefreshCw size={20} color={colors.text.secondary} />
              )}
            </TouchableOpacity>
          </HStack>

          <PriorityList
            priorities={sortedPriorities}
            onItemPress={(messageId, _, level) =>
              handleMessagePress(messageId, level)
            }
            colors={colors}
            emptyMessage="No priority messages detected"
            emptySubmessage="Priority messages with urgent keywords or blockers will appear here"
          />
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    height: '85%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
});
