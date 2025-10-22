import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/auth';
import { PresenceInitializer } from '../components/PresenceInitializer';
import AuthScreen from '../screens/AuthScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{ title: 'Chats' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuthStore();

  if (loading) {
    // You can add a loading screen here
    return null;
  }

  return (
    <PresenceInitializer>
      <NavigationContainer>
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
