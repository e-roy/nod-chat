import React from 'react';
import { ScrollView, Text as RNText } from 'react-native';
import { Box } from '@ui/box';
import { VStack } from '@ui/vstack';
import { HStack } from '@ui/hstack';
import { Button, ButtonText } from '@ui/button';
import { Input, InputField } from '@ui/input';
import { getColors } from '@/utils/colors';
import { SearchResult } from '@chatapp/shared';

interface SearchTabProps {
  isDark: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  results: SearchResult[];
  isLoading: boolean;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  isDark,
  searchQuery,
  setSearchQuery,
  handleSearch,
  results,
  isLoading,
}) => {
  const colors = getColors(isDark);

  return (
    <VStack space="md" style={{ flex: 1 }}>
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
        <Button onPress={handleSearch} disabled={isLoading}>
          <ButtonText>Search</ButtonText>
        </Button>
      </HStack>

      {results.length > 0 ? (
        <ScrollView style={{ flex: 1, flexShrink: 0 }}>
          {results.map(result => (
            <Box
              key={result.messageId}
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
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.info,
                  marginBottom: 4,
                }}
              >
                Relevance: {result.relevance}%
              </RNText>
              <RNText style={{ fontSize: 14, color: colors.text.primary }}>
                {result.snippet}
              </RNText>
            </Box>
          ))}
        </ScrollView>
      ) : searchQuery ? (
        <RNText
          style={{
            fontSize: 14,
            textAlign: 'center',
            paddingVertical: 24,
            color: colors.text.muted,
          }}
        >
          No results found
        </RNText>
      ) : (
        <RNText
          style={{
            fontSize: 14,
            textAlign: 'center',
            paddingVertical: 24,
            color: colors.text.muted,
          }}
        >
          Enter a search query to find messages
        </RNText>
      )}
    </VStack>
  );
};
