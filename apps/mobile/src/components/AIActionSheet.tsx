import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import {
  Search,
  FileText,
  CheckSquare,
  GitBranch,
  RefreshCw,
} from 'lucide-react-native';
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
  const colors = getColors(isDark);
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    chatAISummaries,
    searchResults,
    loading,
    errors,
    autoGenerateSummary,
    extractActionItems,
    extractDecisions,
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      await searchMessages(chatId, searchQuery);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleRefreshActions = async () => {
    try {
      await extractActionItems(chatId, true);
    } catch (err) {
      console.error('Action items extraction failed:', err);
    }
  };

  const handleRefreshDecisions = async () => {
    try {
      await extractDecisions(chatId);
    } catch (err) {
      console.error('Decisions extraction failed:', err);
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

  const renderActionsTab = () => (
    <VStack space="md" style={styles.tabContent}>
      <HStack space="sm" style={{ justifyContent: 'space-between' }}>
        <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Action Items
        </RNText>
        <TouchableOpacity
          onPress={handleRefreshActions}
          disabled={isLoadingActions}
          accessibilityLabel="Refresh action items"
          accessibilityRole="button"
        >
          <RefreshCw size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </HStack>

      {isLoadingActions ? (
        <Box style={styles.centerContent}>
          <ActivityIndicator color={colors.info} />
        </Box>
      ) : chatAI?.actionItems && chatAI.actionItems.length > 0 ? (
        <ScrollView style={styles.resultsList}>
          {chatAI.actionItems.map(item => (
            <Box
              key={item.id}
              style={[
                styles.actionItem,
                {
                  backgroundColor: colors.bg.secondary,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <RNText
                style={[styles.actionText, { color: colors.text.primary }]}
              >
                {item.text}
              </RNText>
              {item.assignee && (
                <RNText
                  style={[styles.assigneeText, { color: colors.text.muted }]}
                >
                  Assigned to: {item.assignee}
                </RNText>
              )}
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
            </Box>
          ))}
        </ScrollView>
      ) : (
        <Box>
          <RNText style={[styles.emptyText, { color: colors.text.muted }]}>
            No action items found. Extract them to get started.
          </RNText>
          <Button onPress={handleRefreshActions} style={{ marginTop: 12 }}>
            <ButtonText>Extract Action Items</ButtonText>
          </Button>
        </Box>
      )}
    </VStack>
  );

  const renderDecisionsTab = () => (
    <VStack space="md" style={styles.tabContent}>
      <HStack space="sm" style={{ justifyContent: 'space-between' }}>
        <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Decisions Made
        </RNText>
        <TouchableOpacity
          onPress={handleRefreshDecisions}
          disabled={isLoadingDecisions}
          accessibilityLabel="Refresh decisions"
          accessibilityRole="button"
        >
          <RefreshCw size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </HStack>

      {isLoadingDecisions ? (
        <Box style={styles.centerContent}>
          <ActivityIndicator color={colors.info} />
        </Box>
      ) : chatAI?.decisions && chatAI.decisions.length > 0 ? (
        <ScrollView style={styles.resultsList}>
          {chatAI.decisions.map(decision => (
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
              <RNText style={[styles.decisionSubject, { color: colors.info }]}>
                {decision.subject}
              </RNText>
              <RNText
                style={[styles.decisionText, { color: colors.text.primary }]}
              >
                {decision.decision}
              </RNText>
              <RNText
                style={[styles.decisionTime, { color: colors.text.muted }]}
              >
                {new Date(decision.timestamp).toLocaleString()}
              </RNText>
            </Box>
          ))}
        </ScrollView>
      ) : (
        <Box>
          <RNText style={[styles.emptyText, { color: colors.text.muted }]}>
            No decisions found. Extract them to get started.
          </RNText>
          <Button onPress={handleRefreshDecisions} style={{ marginTop: 12 }}>
            <ButtonText>Extract Decisions</ButtonText>
          </Button>
        </Box>
      )}
    </VStack>
  );

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
