import React from 'react';
import { ScrollView, Text as RNText, ActivityIndicator } from 'react-native';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { Decision, ChatAI } from '@chatapp/shared';
import { getColors } from '@/utils/colors';
import { LoadingBanner } from './LoadingBanner';
import { MetadataDisplay } from './MetadataDisplay';
import { formatRelativeTime } from './utils';

interface DecisionsTabProps {
  isDark: boolean;
  chatAI: ChatAI | undefined;
  isLoading: boolean;
}

export const DecisionsTab: React.FC<DecisionsTabProps> = ({
  isDark,
  chatAI,
  isLoading,
}) => {
  const colors = getColors(isDark);
  const hasDecisions = chatAI?.decisions && chatAI.decisions.length > 0;
  const decisionsCount = chatAI?.decisions?.length || 0;
  const messageCount = chatAI?.messageCount || 0;
  const lastUpdated = chatAI?.lastUpdated || 0;

  return (
    <VStack space="md" style={{ flex: 1 }}>
      <RNText
        style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}
      >
        Decisions Made
      </RNText>

      {isLoading && !hasDecisions ? (
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
            Extracting decisions...
          </RNText>
        </Box>
      ) : hasDecisions ? (
        <>
          {isLoading && (
            <LoadingBanner
              message="Updating decisions..."
              color={colors.info}
            />
          )}

          {decisionsCount > 0 && messageCount > 0 && (
            <MetadataDisplay color={colors.text.muted}>
              {decisionsCount} decisions from {messageCount} messages • Updated{' '}
              {formatRelativeTime(lastUpdated)}
            </MetadataDisplay>
          )}

          <ScrollView style={{ flex: 1, flexShrink: 0 }}>
            {chatAI.decisions
              .sort((a: Decision, b: Decision) => b.timestamp - a.timestamp)
              .map((decision: Decision) => (
                <Box
                  key={decision.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    marginBottom: 8,
                    backgroundColor: colors.bg.secondary,
                    borderColor: colors.border.default,
                  }}
                >
                  <RNText
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      marginBottom: 4,
                      color: colors.info,
                    }}
                  >
                    {decision.subject}
                  </RNText>
                  <RNText
                    style={{
                      fontSize: 14,
                      marginBottom: 4,
                      color: colors.text.primary,
                    }}
                  >
                    {decision.decision}
                  </RNText>
                  <RNText style={{ fontSize: 12, color: colors.text.muted }}>
                    {new Date(decision.timestamp).toLocaleString()}
                  </RNText>
                </Box>
              ))}
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
            No decisions found.
          </RNText>
        </Box>
      )}
    </VStack>
  );
};
