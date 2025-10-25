import React, { useEffect } from 'react';
import { FlatList, Text as RNText, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ButtonText } from '@ui/button';
import { VStack } from '@ui/vstack';

import { useGroupStore } from '@/store/groups';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { getColors } from '@/utils/colors';
import { Group } from '@chatapp/shared';
import GroupItem from '@/components/GroupItem';
import ListSkeleton from '@/components/ListSkeleton';

const GroupListScreen = () => {
  const { groups, loading, error, loadGroups, initializeTransport } =
    useGroupStore();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);

  useEffect(() => {
    if (user) {
      initializeTransport();
      loadGroups();
    }
  }, [user, initializeTransport, loadGroups]);

  const renderGroupItem = ({ item }: { item: Group }) => (
    <GroupItem group={item} />
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg.primary }]}
      >
        <ListSkeleton itemCount={4} showHeader={false} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg.primary }]}
      >
        <VStack className="flex-1 justify-center items-center p-4">
          <RNText style={[styles.errorText, { color: colors.error }]}>
            {error}
          </RNText>
          <Button onPress={loadGroups}>
            <ButtonText>Retry</ButtonText>
          </Button>
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
    >
      <FlatList
        data={groups}
        keyExtractor={item => item.id}
        renderItem={renderGroupItem}
        className="flex-1"
        ListEmptyComponent={
          <VStack className="flex-1 justify-center items-center p-8">
            <RNText
              style={[styles.emptyTitle, { color: colors.text.secondary }]}
            >
              No groups yet
            </RNText>
            <RNText
              style={[styles.emptySubtitle, { color: colors.text.muted }]}
            >
              Create a group to start chatting with multiple people
            </RNText>
          </VStack>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default GroupListScreen;
