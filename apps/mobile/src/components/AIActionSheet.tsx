import React, { useState, useEffect } from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@ui/actionsheet';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { Button, ButtonText } from '@ui/button';
import { useThemeStore } from '@/store/theme';
import { useAIStore } from '@/store/ai';
import { useAuthStore } from '@/store/auth';
import { getColors } from '@/utils/colors';
import {
  SearchTab,
  SummaryTab,
  ActionsTab,
  DecisionsTab,
  TabButtons,
} from './ai-sheet';

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

  const renderContent = () => {
    switch (activeTab) {
      case 'search':
        return (
          <SearchTab
            isDark={isDark}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
            results={results}
            isLoading={isLoadingSearch}
          />
        );
      case 'summary':
        return (
          <SummaryTab
            isDark={isDark}
            chatAI={chatAI}
            isLoading={isLoadingSummary}
          />
        );
      case 'actions':
        return (
          <ActionsTab
            isDark={isDark}
            chatAI={chatAI}
            isLoading={isLoadingActions}
            currentUserId={user?.uid}
          />
        );
      case 'decisions':
        return (
          <DecisionsTab
            isDark={isDark}
            chatAI={chatAI}
            isLoading={isLoadingDecisions}
          />
        );
    }
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent style={{ backgroundColor: colors.bg.primary }}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <VStack style={styles.container}>
          <RNText style={[styles.title, { color: colors.text.primary }]}>
            AI Assistant
          </RNText>

          <Box style={{ marginBottom: 8 }}>
            <TabButtons
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              colors={colors}
            />
          </Box>

          {error && (
            <Box
              style={[
                styles.errorBox,
                { backgroundColor: colors.error + '20', marginBottom: 8 },
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

          <Box style={{ flex: 1, minHeight: 0 }}>{renderContent()}</Box>
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
});
