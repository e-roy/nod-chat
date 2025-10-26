import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { Search, FileText, CheckSquare, GitBranch } from 'lucide-react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@ui/actionsheet';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { Button, ButtonText } from '@ui/button';
import { Input, InputField } from '@ui/input';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { useAIStore } from '@/store/ai';
import { useAuthStore } from '@/store/auth';

interface AIActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
}

type Tab = 'search' | 'summary' | 'actions' | 'decisions';

export const AIActionSheet: React.FC<AIActionSheetProps> = ({
  isOpen,
  onClose,
  chatId,
}) => {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const colors = getColors(isDark);
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    chatAISummaries,
    searchResults,
    loading,
    errors,
    autoGenerateSummary,
    autoExtractActionItems,
    autoExtractDecisions,
    searchMessages,
    clearError,
  } = useAIStore();

  const chatAI = chatAISummaries.get(chatId);
  const results = searchResults.get(chatId) || [];
  const error = errors.get(chatId);

  const isLoadingSummary = loading.get(`summary-${chatId}`) || false;
  const isLoadingActions = loading.get(`actions-${chatId}`) || false;
  const isLoadingDecisions = loading.get(`decisions-${chatId}`) || false;
  const isLoadingSearch = loading.get(`search-${chatId}`) || false;

  // Auto-generate summary when sheet opens and summary tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'summary') {
      autoGenerateSummary(chatId).catch(err => {
        console.error('Auto-generate summary failed:', err);
      });
    }
  }, [isOpen, activeTab, chatId, autoGenerateSummary]);

  // Auto-refresh when switching to summary tab
  useEffect(() => {
    if (isOpen && activeTab === 'summary') {
      autoGenerateSummary(chatId).catch(err => {
        console.error('Auto-generate summary on tab switch failed:', err);
      });
    }
  }, [activeTab, chatId, isOpen, autoGenerateSummary]);

  // Auto-extract action items when switching to actions tab
  useEffect(() => {
    if (isOpen && activeTab === 'actions') {
      autoExtractActionItems(chatId).catch(err => {
        console.error('Auto-extract action items on tab switch failed:', err);
      });
    }
  }, [activeTab, chatId, isOpen, autoExtractActionItems]);

  // Auto-extract decisions when switching to decisions tab
  useEffect(() => {
    if (isOpen && activeTab === 'decisions') {
      autoExtractDecisions(chatId).catch(err => {
        console.error('Auto-extract decisions on tab switch failed:', err);
      });
    }
  }, [activeTab, chatId, isOpen, autoExtractDecisions]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      await searchMessages(chatId, searchQuery);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const renderTabButtons = () => (
    <HStack space="sm" style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          { backgroundColor: colors.bg.secondary },
          activeTab === 'search' && {
            backgroundColor: colors.info,
          },
        ]}
        onPress={() => setActiveTab('search')}
        accessibilityLabel="Search"
        accessibilityRole="button"
      >
        <Search
          size={20}
          color={activeTab === 'search' ? '#FFFFFF' : colors.text.secondary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          { backgroundColor: colors.bg.secondary },
          activeTab === 'summary' && {
            backgroundColor: colors.info,
          },
        ]}
        onPress={() => setActiveTab('summary')}
        accessibilityLabel="Summary"
        accessibilityRole="button"
      >
        <FileText
          size={20}
          color={activeTab === 'summary' ? '#FFFFFF' : colors.text.secondary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          { backgroundColor: colors.bg.secondary },
          activeTab === 'actions' && {
            backgroundColor: colors.info,
          },
        ]}
        onPress={() => setActiveTab('actions')}
        accessibilityLabel="Action Items"
        accessibilityRole="button"
      >
        <CheckSquare
          size={20}
          color={activeTab === 'actions' ? '#FFFFFF' : colors.text.secondary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          { backgroundColor: colors.bg.secondary },
          activeTab === 'decisions' && {
            backgroundColor: colors.info,
          },
        ]}
        onPress={() => setActiveTab('decisions')}
        accessibilityLabel="Decisions"
        accessibilityRole="button"
      >
        <GitBranch
          size={20}
          color={activeTab === 'decisions' ? '#FFFFFF' : colors.text.secondary}
        />
      </TouchableOpacity>
    </HStack>
  );

  const renderSearchTab = () => (
    <VStack space="md" style={styles.tabContent}>
      <HStack space="sm">
        <Input style={{ flex: 1 }}>
          <InputField
            placeholder="Search messages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor={colors.text.muted}
          />
        </Input>
        <Button onPress={handleSearch} disabled={isLoadingSearch}>
          <ButtonText>Search</ButtonText>
        </Button>
      </HStack>

      {isLoadingSearch ? (
        <Box style={styles.centerContent}>
          <ActivityIndicator color={colors.info} />
        </Box>
      ) : results.length > 0 ? (
        <ScrollView style={styles.resultsList}>
          {results.map(result => (
            <Box
              key={result.messageId}
              style={[
                styles.resultItem,
                {
                  backgroundColor: colors.bg.secondary,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <RNText style={[styles.resultRelevance, { color: colors.info }]}>
                Relevance: {result.relevance}%
              </RNText>
              <RNText
                style={[styles.resultSnippet, { color: colors.text.primary }]}
              >
                {result.snippet}
              </RNText>
            </Box>
          ))}
        </ScrollView>
      ) : searchQuery ? (
        <RNText style={[styles.emptyText, { color: colors.text.muted }]}>
          No results found
        </RNText>
      ) : (
        <RNText style={[styles.emptyText, { color: colors.text.muted }]}>
          Enter a search query to find messages
        </RNText>
      )}
    </VStack>
  );

  const renderSummaryTab = () => {
    const hasSummary = !!chatAI?.summary;
    const isLoading = isLoadingSummary;
    const messageCount = chatAI?.messageCount || 0;
    const lastUpdated = chatAI?.lastUpdated || 0;

    // Helper to format relative time
    const formatRelativeTime = (timestamp: number) => {
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    };

    return (
      <VStack space="md" style={styles.tabContent}>
        <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Conversation Summary
        </RNText>

        {isLoading && !hasSummary ? (
          // Loading without existing summary
          <Box style={styles.centerContent}>
            <ActivityIndicator color={colors.info} />
            <RNText
              style={[
                styles.emptyText,
                { color: colors.text.muted, marginTop: 12 },
              ]}
            >
              Generating summary...
            </RNText>
          </Box>
        ) : hasSummary ? (
          // Has summary (may be loading in background)
          <>
            {/* Loading overlay banner */}
            {isLoading && (
              <Box
                style={[
                  styles.loadingBanner,
                  {
                    backgroundColor: colors.info + '20',
                    borderColor: colors.info + '40',
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.info} />
                <RNText
                  style={[styles.loadingBannerText, { color: colors.info }]}
                >
                  Updating summary...
                </RNText>
              </Box>
            )}

            {/* Metadata */}
            {messageCount > 0 && (
              <RNText
                style={[styles.metadataText, { color: colors.text.muted }]}
              >
                Summary of {messageCount} messages • Updated{' '}
                {formatRelativeTime(lastUpdated)}
              </RNText>
            )}

            {/* Summary content */}
            <ScrollView
              style={styles.summaryContent}
              showsVerticalScrollIndicator
            >
              <RNText
                style={[styles.summaryText, { color: colors.text.primary }]}
              >
                {chatAI.summary}
              </RNText>
            </ScrollView>
          </>
        ) : (
          // No summary
          <Box>
            <RNText style={[styles.emptyText, { color: colors.text.muted }]}>
              No summary available.
            </RNText>
          </Box>
        )}
      </VStack>
    );
  };

  const renderActionsTab = () => {
    const hasActionItems = chatAI?.actionItems && chatAI.actionItems.length > 0;
    const isLoading = isLoadingActions;
    const actionItemsCount = chatAI?.actionItems?.length || 0;
    const messageCount = chatAI?.messageCount || 0;
    const lastUpdated = chatAI?.lastUpdated || 0;

    // Helper to format relative time
    const formatRelativeTime = (timestamp: number) => {
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    };

    // Helper to format due date with absolute date
    const formatDueDate = (timestamp: number, status?: string) => {
      // For completed items, just show the date without urgency indicators
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
      // Always show green for completed items, regardless of due date
      if (status === 'done') return colors.success;

      if (!dueDate) return colors.text.secondary;

      const now = Date.now();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const dueDateObj = new Date(dueDate);
      dueDateObj.setHours(0, 0, 0, 0);

      const diff = dueDateObj.getTime() - today.getTime();
      const days = Math.ceil(diff / 86400000);

      if (days < 0) return '#EF4444'; // Red for overdue
      if (days === 0) return '#F59E0B'; // Orange for today
      if (days <= 3) return '#F97316'; // Orange for soon
      if (days <= 7) return '#EAB308'; // Yellow for this week
      return colors.text.secondary;
    };

    // Helper to check if item is assigned to current user
    const isAssignedToMe = (assignee?: string) => {
      if (!assignee || !user) return false;
      const assigneeLower = assignee.toLowerCase();
      const userDisplayName = user.displayName?.toLowerCase();
      const userEmail = user.email?.toLowerCase();
      return (
        assigneeLower === userDisplayName ||
        assigneeLower === userEmail ||
        assigneeLower === user.uid.toLowerCase()
      );
    };

    // Sort and filter action items
    const sortedActionItems = chatAI?.actionItems
      ? [...chatAI.actionItems].sort((a, b) => {
          // First: incomplete items before done items
          if (a.status !== b.status) {
            return a.status === 'done' ? 1 : -1;
          }

          // Second: items with due dates before items without
          if (a.dueDate && !b.dueDate) return -1;
          if (!a.dueDate && b.dueDate) return 1;

          // Third: sort by due date (earliest first)
          if (a.dueDate && b.dueDate) {
            return a.dueDate - b.dueDate;
          }

          // Fourth: prioritize items assigned to current user
          const aAssignedToMe = isAssignedToMe(a.assignee);
          const bAssignedToMe = isAssignedToMe(b.assignee);
          if (aAssignedToMe && !bAssignedToMe) return -1;
          if (!aAssignedToMe && bAssignedToMe) return 1;

          return 0;
        })
      : [];

    return (
      <VStack space="md" style={styles.tabContent}>
        <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Action Items
        </RNText>

        {isLoading && !hasActionItems ? (
          // Loading without existing action items
          <Box style={styles.centerContent}>
            <ActivityIndicator color={colors.info} />
            <RNText
              style={[
                styles.emptyText,
                { color: colors.text.muted, marginTop: 12 },
              ]}
            >
              Extracting action items...
            </RNText>
          </Box>
        ) : hasActionItems ? (
          // Has action items (may be loading in background)
          <>
            {/* Loading overlay banner */}
            {isLoading && (
              <Box
                style={[
                  styles.loadingBanner,
                  {
                    backgroundColor: colors.info + '20',
                    borderColor: colors.info + '40',
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.info} />
                <RNText
                  style={[styles.loadingBannerText, { color: colors.info }]}
                >
                  Updating action items...
                </RNText>
              </Box>
            )}

            {/* Metadata */}
            {actionItemsCount > 0 && messageCount > 0 && (
              <RNText
                style={[styles.metadataText, { color: colors.text.muted }]}
              >
                {actionItemsCount} action items from {messageCount} messages •
                Updated {formatRelativeTime(lastUpdated)}
              </RNText>
            )}

            {/* Action items list */}
            <ScrollView style={styles.resultsList}>
              {sortedActionItems.map(item => {
                const assignedToMe = isAssignedToMe(item.assignee);
                const dueDateColor = getUrgencyColor(item.dueDate, item.status);
                const isAssigned = assignedToMe;

                return (
                  <Box
                    key={item.id}
                    style={[
                      styles.actionItem,
                      {
                        backgroundColor: colors.bg.secondary,
                        borderColor: isAssigned
                          ? colors.info
                          : colors.border.default,
                        borderWidth: isAssigned ? 2 : 1,
                      },
                    ]}
                  >
                    <HStack
                      space="sm"
                      alignItems="start"
                      justifyContent="between"
                    >
                      <VStack flex={1} space="xs">
                        <RNText
                          style={[
                            styles.actionText,
                            { color: colors.text.primary },
                          ]}
                        >
                          {item.text}
                        </RNText>
                        <HStack space="md" alignItems="center">
                          {item.assignee && (
                            <RNText
                              style={[
                                styles.assigneeText,
                                { color: colors.text.muted },
                              ]}
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
                              style={[
                                styles.dueDateText,
                                { color: dueDateColor, fontWeight: '600' },
                              ]}
                            >
                              {formatDueDate(item.dueDate, item.status)}
                            </RNText>
                          )}
                        </HStack>
                      </VStack>
                      <RNText
                        style={[
                          styles.statusText,
                          {
                            color:
                              item.status === 'done'
                                ? colors.success
                                : colors.text.secondary,
                          },
                        ]}
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
          // No action items
          <Box>
            <RNText style={[styles.emptyText, { color: colors.text.muted }]}>
              No action items found.
            </RNText>
          </Box>
        )}
      </VStack>
    );
  };

  const renderDecisionsTab = () => {
    const hasDecisions = chatAI?.decisions && chatAI.decisions.length > 0;
    const isLoading = isLoadingDecisions;
    const decisionsCount = chatAI?.decisions?.length || 0;
    const messageCount = chatAI?.messageCount || 0;
    const lastUpdated = chatAI?.lastUpdated || 0;

    // Helper to format relative time
    const formatRelativeTime = (timestamp: number) => {
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    };

    return (
      <VStack space="md" style={styles.tabContent}>
        <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Decisions Made
        </RNText>

        {isLoading && !hasDecisions ? (
          // Loading without existing decisions
          <Box style={styles.centerContent}>
            <ActivityIndicator color={colors.info} />
            <RNText
              style={[
                styles.emptyText,
                { color: colors.text.muted, marginTop: 12 },
              ]}
            >
              Extracting decisions...
            </RNText>
          </Box>
        ) : hasDecisions ? (
          // Has decisions (may be loading in background)
          <>
            {/* Loading overlay banner */}
            {isLoading && (
              <Box
                style={[
                  styles.loadingBanner,
                  {
                    backgroundColor: colors.info + '20',
                    borderColor: colors.info + '40',
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.info} />
                <RNText
                  style={[styles.loadingBannerText, { color: colors.info }]}
                >
                  Updating decisions...
                </RNText>
              </Box>
            )}

            {/* Metadata */}
            {decisionsCount > 0 && messageCount > 0 && (
              <RNText
                style={[styles.metadataText, { color: colors.text.muted }]}
              >
                {decisionsCount} decisions from {messageCount} messages •
                Updated {formatRelativeTime(lastUpdated)}
              </RNText>
            )}

            {/* Decisions list - sorted by most recent first */}
            <ScrollView style={styles.resultsList}>
              {chatAI.decisions
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(decision => (
                  <Box
                    key={decision.id}
                    style={[
                      styles.decisionItem,
                      {
                        backgroundColor: colors.bg.secondary,
                        borderColor: colors.border.default,
                      },
                    ]}
                  >
                    <RNText
                      style={[styles.decisionSubject, { color: colors.info }]}
                    >
                      {decision.subject}
                    </RNText>
                    <RNText
                      style={[
                        styles.decisionText,
                        { color: colors.text.primary },
                      ]}
                    >
                      {decision.decision}
                    </RNText>
                    <RNText
                      style={[
                        styles.decisionTime,
                        { color: colors.text.muted },
                      ]}
                    >
                      {new Date(decision.timestamp).toLocaleString()}
                    </RNText>
                  </Box>
                ))}
            </ScrollView>
          </>
        ) : (
          // No decisions
          <Box>
            <RNText style={[styles.emptyText, { color: colors.text.muted }]}>
              No decisions found.
            </RNText>
          </Box>
        )}
      </VStack>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'search':
        return renderSearchTab();
      case 'summary':
        return renderSummaryTab();
      case 'actions':
        return renderActionsTab();
      case 'decisions':
        return renderDecisionsTab();
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
          <RNText style={[styles.title, { color: colors.text.primary }]}>
            AI Assistant
          </RNText>

          {renderTabButtons()}

          {error && (
            <Box
              style={[
                styles.errorBox,
                { backgroundColor: colors.error + '20' },
              ]}
            >
              <RNText style={[styles.errorText, { color: colors.error }]}>
                {error}
              </RNText>
              <Button
                size="sm"
                variant="link"
                onPress={() => clearError(chatId)}
              >
                <ButtonText style={{ color: colors.error }}>Dismiss</ButtonText>
              </Button>
            </Box>
          )}

          {renderContent()}
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
  tabContainer: {
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabContent: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  resultRelevance: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultSnippet: {
    fontSize: 14,
  },
  summaryContent: {
    flex: 1,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 4,
  },
  actionItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    marginBottom: 4,
  },
  assigneeText: {
    fontSize: 12,
    marginBottom: 2,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  decisionItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  decisionSubject: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  decisionText: {
    fontSize: 14,
    marginBottom: 4,
  },
  decisionTime: {
    fontSize: 12,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  loadingBanner: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingBannerText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  metadataText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
