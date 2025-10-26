import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Search, FileText, CheckSquare, GitBranch } from 'lucide-react-native';
import { HStack } from '@ui/hstack';

type Tab = 'search' | 'summary' | 'actions' | 'decisions';

interface TabButtonsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  colors: any;
}

export const TabButtons: React.FC<TabButtonsProps> = ({
  activeTab,
  setActiveTab,
  colors,
}) => {
  const tabs: Array<{ key: Tab; icon: any; label: string }> = [
    { key: 'search', icon: Search, label: 'Search' },
    { key: 'summary', icon: FileText, label: 'Summary' },
    { key: 'actions', icon: CheckSquare, label: 'Action Items' },
    { key: 'decisions', icon: GitBranch, label: 'Decisions' },
  ];

  return (
    <HStack space="sm" style={{ marginBottom: 16 }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={{
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: isActive ? colors.info : colors.bg.secondary,
            }}
            onPress={() => setActiveTab(tab.key)}
            accessibilityLabel={tab.label}
            accessibilityRole="button"
          >
            <Icon
              size={20}
              color={isActive ? '#FFFFFF' : colors.text.secondary}
            />
          </TouchableOpacity>
        );
      })}
    </HStack>
  );
};
