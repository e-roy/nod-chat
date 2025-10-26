import React from 'react';
import { ScrollView, Text as RNText, ActivityIndicator } from 'react-native';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { ChatAI } from '@chatapp/shared';
import { getColors } from '@/utils/colors';
import { LoadingBanner } from './LoadingBanner';
import { MetadataDisplay } from './MetadataDisplay';
import { formatRelativeTime } from './utils';

interface SummaryTabProps {
  isDark: boolean;
  chatAI: ChatAI | undefined;
  isLoading: boolean;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  isDark,
  chatAI,
  isLoading,
}) => {
  const colors = getColors(isDark);
  const hasSummary = !!chatAI?.summary;
  const messageCount = chatAI?.messageCount || 0;
  const lastUpdated = chatAI?.lastUpdated || 0;

  return (
    <VStack space="md" style={{ flex: 1 }}>
      <RNText
        style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}
      >
        Conversation Summary
      </RNText>

      {isLoading && !hasSummary ? (
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
              paddingVertical: 24,
              color: colors.text.muted,
              marginTop: 12,
            }}
          >
            Generating summary...
          </RNText>
        </Box>
      ) : hasSummary ? (
        <>
          {isLoading && (
            <LoadingBanner message="Updating summary..." color={colors.info} />
          )}

          {messageCount > 0 && (
            <MetadataDisplay color={colors.text.muted}>
              Summary of {messageCount} messages • Updated{' '}
              {formatRelativeTime(lastUpdated)}
            </MetadataDisplay>
          )}

          <Box
            style={{
              flex: 1,
              backgroundColor: colors.bg.secondary,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator
              contentContainerStyle={{ padding: 12, flexGrow: 1 }}
            >
              <RNText
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.text.primary,
                }}
              >
                {chatAI.summary}
              </RNText>
            </ScrollView>
          </Box>
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
            No summary available.
          </RNText>
        </Box>
      )}
    </VStack>
  );
};
