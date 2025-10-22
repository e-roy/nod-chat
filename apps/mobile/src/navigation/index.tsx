import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Users, Settings } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';

import { useNavigationTheme } from '@/utils/navigationTheme';
import { PresenceInitializer } from '@/components/PresenceInitializer';

import AuthScreen from '@/screens/AuthScreen';
import ChatListScreen from '@/screens/ChatListScreen';
import ChatScreen from '@/screens/ChatScreen';
import NewChatScreen from '@/screens/NewChatScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import ProfileSetupScreen from '@/screens/ProfileSetupScreen';
import GroupListScreen from '@/screens/GroupListScreen';
import GroupChatScreen from '@/screens/GroupChatScreen';
import GroupCreateScreen from '@/screens/GroupCreateScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const colors = useNavigationTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: colors.headerBackground,
          borderBottomWidth: 1,
          borderBottomColor: colors.headerBorder,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: colors.headerTitle,
        },
      }}
    >
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Chats tab',
          headerTitle: 'Messages',
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupListScreen}
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          tabBarAccessibilityLabel: 'Groups tab',
          headerTitle: 'Groups',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Settings tab',
          headerTitle: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuthStore();
  const colors = useNavigationTheme();

  if (loading) {
    // You can add a loading screen here
    return null;
  }

  return (
    <PresenceInitializer>
      <NavigationContainer
        theme={{
          dark: useThemeStore.getState().isDark,
          colors: {
            primary: colors.tabBarActive,
            background: colors.tabBarBackground,
            card: colors.headerBackground,
            text: colors.headerTitle,
            border: colors.headerBorder,
            notification: colors.tabBarActive,
          },
          fonts: {
            regular: {
              fontFamily: 'System',
              fontWeight: '400',
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500',
            },
            bold: {
              fontFamily: 'System',
              fontWeight: '700',
            },
            heavy: {
              fontFamily: 'System',
              fontWeight: '900',
            },
          },
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{
                  title: 'Chat',
                  headerShown: true,
                }}
              />
              <Stack.Screen
                name="NewChat"
                component={NewChatScreen}
                options={{
                  title: 'New Chat',
                  headerShown: true,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="ProfileSetup"
                component={ProfileSetupScreen}
                options={{
                  title: 'Complete Profile',
                  headerShown: true,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="GroupChat"
                component={GroupChatScreen as any}
                options={{
                  title: 'Group Chat',
                  headerShown: true,
                }}
              />
              <Stack.Screen
                name="GroupCreate"
                component={GroupCreateScreen}
                options={{
                  title: 'Create Group',
                  headerShown: true,
                  presentation: 'modal',
                }}
              />
            </>
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PresenceInitializer>
  );
};

export default AppNavigator;
