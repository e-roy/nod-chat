import React, { useEffect, useRef } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Users, Settings, Plus } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { Box } from '@ui/box';

import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';

import { useNavigationTheme } from '@/utils/navigationTheme';
import { PresenceInitializer } from '@/components/PresenceInitializer';
import {
  setupNotificationListeners,
  showLocalNotification,
} from '@/messaging/notifications';
import { useChatStore } from '@/store/chat';
import { RootStackParamList } from '@/types/navigation';

import AuthScreen from '@/screens/AuthScreen';
import ChatListScreen from '@/screens/ChatListScreen';
import ChatScreen from '@/screens/ChatScreen';
import NewChatScreen from '@/screens/NewChatScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import ProfileEditScreen from '@/screens/ProfileEditScreen';
import GroupListScreen from '@/screens/GroupListScreen';
import GroupChatScreen from '@/screens/GroupChatScreen';
import GroupCreateScreen from '@/screens/GroupCreateScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const NewChatButton = () => {
  const navigation = useNavigation<any>();
  const colors = useNavigationTheme();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('NewChat')}
      style={{ marginRight: 16 }}
      accessibilityLabel="Create new chat"
      accessibilityRole="button"
    >
      <Box>
        <Plus size={24} color={colors.headerTitle} />
      </Box>
    </TouchableOpacity>
  );
};

const CreateGroupButton = () => {
  const navigation = useNavigation<any>();
  const colors = useNavigationTheme();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('GroupCreate')}
      style={{ marginRight: 16 }}
      accessibilityLabel="Create new group"
      accessibilityRole="button"
    >
      <Box>
        <Plus size={24} color={colors.headerTitle} />
      </Box>
    </TouchableOpacity>
  );
};

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
            <Box>
              <MessageCircle size={size} color={color} />
            </Box>
          ),
          tabBarAccessibilityLabel: 'Chats tab',
          headerTitle: 'Messages',
          headerRight: () => <NewChatButton />,
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupListScreen}
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <Box>
              <Users size={size} color={color} />
            </Box>
          ),
          tabBarAccessibilityLabel: 'Groups tab',
          headerTitle: 'Groups',
          headerRight: () => <CreateGroupButton />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Box>
              <Settings size={size} color={color} />
            </Box>
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
  const { currentChatId } = useChatStore();
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    if (!user) return;

    // Set up notification handlers
    setupNotificationListeners(
      // Handle notifications received while app is in foreground
      notification => {
        const data = notification.request.content.data;
        const chatId = data?.chatId as string;
        // const isGroup = data?.isGroup === 'true';
        const title = notification.request.content.title || 'New Message';
        const body = notification.request.content.body || '';

        // Only show notification if it's NOT from the currently active chat
        if (chatId && chatId !== currentChatId) {
          showLocalNotification(title, body, data).catch(error => {
            console.warn('Failed to show local notification:', error);
          });
        }
      },
      // Handle notification taps (deep linking)
      response => {
        const data = response.notification.request.content.data;
        const chatId = data?.chatId as string;
        const isGroup = data?.isGroup === 'true';

        if (chatId && navigationRef.current) {
          // Navigate to the appropriate chat screen
          if (isGroup) {
            navigationRef.current.navigate('GroupChat', {
              groupId: chatId,
            });
          } else {
            // For regular chats, we need to get the participant name
            // This is a simplification - in production, you'd fetch this from Firestore
            navigationRef.current.navigate('Chat', {
              chatId,
              participantName: data?.senderName as string | undefined,
            });
          }
        }
      }
    );

    // Clean up listeners when component unmounts or user changes
    return () => {
      // Cleanup is handled in auth store signOut
    };
  }, [user, currentChatId]);

  if (loading) {
    // You can add a loading screen here
    return null;
  }

  return (
    <PresenceInitializer>
      <NavigationContainer
        ref={navigationRef}
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
                name="ProfileEdit"
                component={ProfileEditScreen}
                options={{
                  title: 'Edit Profile',
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
