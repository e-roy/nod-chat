import React from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  View,
} from 'react-native';
import { Box } from '@ui/box';

import { HStack } from '@ui/hstack';
import { Badge, BadgeText } from '@ui/badge';
import { AlertCircle } from 'lucide-react-native';
import { Priority } from '@chatapp/shared';
import { formatDistanceToNow } from '@/utils/time';

interface PriorityListProps {
  priorities: Priority[];
  onItemPress: (
    messageId: string,
    chatId: string,
    level: 'high' | 'urgent'
  ) => void;
  showChatContext?: boolean;
  chatNames?: Map<string, string>; // chatId -> name
  emptyMessage?: string;
  emptySubmessage?: string;
  colors: {
    text: { primary: string; secondary: string; muted: string };
    bg: { primary: string; secondary: string };
    border: { default: string };
    error: string;
    warning: string;
  };
}

export const PriorityList: React.FC<PriorityListProps> = ({
  priorities,
  onItemPress,
  showChatContext = false,
  chatNames = new Map(),
  emptyMessage = 'No priority messages detected',
  emptySubmessage = 'Priority messages with urgent keywords or blockers will appear here',
  colors,
}) => {
  if (priorities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <AlertCircle size={60} color={colors.text.muted} opacity={0.5} />
        <RNText style={[styles.emptyText, { color: colors.text.primary }]}>
          {emptyMessage}
        </RNText>
        <RNText style={[styles.emptySubtext, { color: colors.text.muted }]}>
          {emptySubmessage}
        </RNText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      {priorities.map((priority, index) => {
        const item = priority as Priority & { chatId?: string };
        return (
          <TouchableOpacity
            key={`${item.messageId}-${item.chatId || ''}-${index}`}
            onPress={() =>
              onItemPress(item.messageId, item.chatId || '', item.level)
            }
          >
            <Box
              style={[
                styles.priorityItem,
                {
                  backgroundColor: colors.bg.secondary,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <HStack
                space="sm"
                style={{
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Badge
                  variant="solid"
                  style={{
                    backgroundColor:
                      item.level === 'urgent' ? colors.error : colors.warning,
                  }}
                >
                  <BadgeText style={{ color: '#FFFFFF' }}>
                    {item.level.toUpperCase()}
                  </BadgeText>
                </Badge>

                <RNText
                  style={[styles.timestamp, { color: colors.text.muted }]}
                >
                  {formatDistanceToNow(item.timestamp)}
                </RNText>
              </HStack>

              {showChatContext && item.chatId && (
                <RNText
                  style={[styles.chatContext, { color: colors.text.secondary }]}
                  numberOfLines={1}
                >
                  {chatNames.get(item.chatId) || 'Chat'}
                </RNText>
              )}

              <RNText style={[styles.reason, { color: colors.text.primary }]}>
                {item.reason}
              </RNText>

              <RNText style={[styles.tapHint, { color: colors.text.muted }]}>
                Tap to view message
              </RNText>
            </Box>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  priorityItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  timestamp: {
    fontSize: 12,
  },
  chatContext: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  reason: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  tapHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
});
