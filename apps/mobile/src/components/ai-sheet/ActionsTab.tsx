import React from 'react';
import { ScrollView, Text as RNText, ActivityIndicator } from 'react-native';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { ActionItem, ChatAI } from '@chatapp/shared';
import { getColors } from '@/utils/colors';
import { LoadingBanner } from './LoadingBanner';
import { MetadataDisplay } from './MetadataDisplay';
import { formatRelativeTime } from './utils';

interface ActionsTabProps {
  isDark: boolean;
  chatAI: ChatAI | undefined;
  isLoading: boolean;
  currentUserId: string | undefined;
}

export const ActionsTab: React.FC<ActionsTabProps> = ({
  isDark,
  chatAI,
  isLoading,
  currentUserId,
}) => {
  const colors = getColors(isDark);
  const hasActionItems = chatAI?.actionItems && chatAI.actionItems.length > 0;
  const actionItemsCount = chatAI?.actionItems?.length || 0;
  const messageCount = chatAI?.messageCount || 0;
  const lastUpdated = chatAI?.lastUpdated || 0;

  // Helper to format due date
  const formatDueDate = (timestamp: number, status?: string) => {
    if (status === 'done') {
      const dueDate = new Date(timestamp);
      return `Completed • ${dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`;
    }

    const now = Date.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(timestamp);
    dueDate.setHours(0, 0, 0, 0);

    const diff = dueDate.getTime() - today.getTime();
    const days = Math.ceil(diff / 86400000);
    const dateStr = dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    if (days < 0) return `Overdue (${dateStr})`;
    if (days === 0) return `Due today (${dateStr})`;
    if (days === 1) return `Due tomorrow (${dateStr})`;
    if (days <= 7) return `Due in ${days} days (${dateStr})`;
    return dateStr;
  };

  // Helper to get urgency color
  const getUrgencyColor = (dueDate?: number, status?: string) => {
    if (status === 'done') return colors.success;
    if (!dueDate) return colors.text.secondary;

    const now = Date.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    const diff = dueDateObj.getTime() - today.getTime();
    const days = Math.ceil(diff / 86400000);

    if (days < 0) return '#EF4444';
    if (days === 0) return '#F59E0B';
    if (days <= 3) return '#F97316';
    if (days <= 7) return '#EAB308';
    return colors.text.secondary;
  };

  // Helper to check if assigned to current user
  const isAssignedToMe = (assignee?: string) => {
    if (!assignee || !currentUserId) return false;
    return assignee.toLowerCase() === currentUserId.toLowerCase();
  };

  // Sort action items
  const sortedActionItems = chatAI?.actionItems
    ? [...chatAI.actionItems].sort((a: ActionItem, b: ActionItem) => {
        if (a.status !== b.status) {
          return a.status === 'done' ? 1 : -1;
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate) {
          return a.dueDate - b.dueDate;
        }
        const aAssigned = isAssignedToMe(a.assignee);
        const bAssigned = isAssignedToMe(b.assignee);
        if (aAssigned && !bAssigned) return -1;
        if (!aAssigned && bAssigned) return 1;
        return 0;
      })
    : [];

  return (
    <VStack space="md" style={{ flex: 1 }}>
      <RNText
        style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}
      >
        Action Items
      </RNText>

      {isLoading && !hasActionItems ? (
        <Box
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 32,
          }}
        >
          <ActivityIndicator color={colors.info} />
          <RNText
            style={{
              fontSize: 14,
              textAlign: 'center',
              color: colors.text.muted,
              marginTop: 12,
            }}
          >
            Extracting action items...
          </RNText>
        </Box>
      ) : hasActionItems ? (
        <>
          {isLoading && (
            <LoadingBanner
              message="Updating action items..."
              color={colors.info}
            />
          )}

          {actionItemsCount > 0 && messageCount > 0 && (
            <MetadataDisplay color={colors.text.muted}>
              {actionItemsCount} action items from {messageCount} messages •
              Updated {formatRelativeTime(lastUpdated)}
            </MetadataDisplay>
          )}

          <ScrollView style={{ flex: 1, flexShrink: 0 }}>
            {sortedActionItems.map(item => {
              const assignedToMe = isAssignedToMe(item.assignee);
              const dueDateColor = getUrgencyColor(item.dueDate, item.status);

              return (
                <Box
                  key={item.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: assignedToMe ? 2 : 1,
                    marginBottom: 8,
                    backgroundColor: colors.bg.secondary,
                    borderColor: assignedToMe
                      ? colors.info
                      : colors.border.default,
                  }}
                >
                  <HStack
                    space="sm"
                    alignItems="start"
                    justifyContent="between"
                  >
                    <VStack flex={1} space="xs">
                      <RNText
                        style={{
                          fontSize: 14,
                          marginBottom: 4,
                          color: colors.text.primary,
                        }}
                      >
                        {item.text}
                      </RNText>
                      <HStack space="md" alignItems="center">
                        {item.assignee && (
                          <RNText
                            style={{
                              fontSize: 12,
                              marginBottom: 2,
                              color: colors.text.muted,
                            }}
                          >
                            Assigned to:{' '}
                            <RNText
                              style={{
                                color: assignedToMe
                                  ? colors.info
                                  : colors.text.muted,
                                fontWeight: assignedToMe ? '600' : '400',
                              }}
                            >
                              {item.assignee}
                            </RNText>
                          </RNText>
                        )}
                        {item.dueDate && (
                          <RNText
                            style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: dueDateColor,
                            }}
                          >
                            {formatDueDate(item.dueDate, item.status)}
                          </RNText>
                        )}
                      </HStack>
                    </VStack>
                    <RNText
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        color:
                          item.status === 'done'
                            ? colors.success
                            : colors.text.secondary,
                      }}
                    >
                      {item.status}
                    </RNText>
                  </HStack>
                </Box>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <Box>
          <RNText
            style={{
              fontSize: 14,
              textAlign: 'center',
              paddingVertical: 24,
              color: colors.text.muted,
            }}
          >
            No action items found.
          </RNText>
        </Box>
      )}
    </VStack>
  );
};
