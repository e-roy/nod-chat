import React, { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { usePresenceStore } from '../store/presence';
import { useChatStore } from '../store/chat';

interface PresenceInitializerProps {
  children: React.ReactNode;
}

export const PresenceInitializer: React.FC<PresenceInitializerProps> = ({
  children,
}) => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      // Clear any previous user's data first
      const chatStore = useChatStore.getState();
      if (chatStore.chats.length > 0 || chatStore.messages.size > 0) {
        chatStore.disconnect();
      }

      // Initialize transport for new user
      const { initializeTransport, loadChats } = useChatStore.getState();
      initializeTransport();

      // Set online status after a brief delay to ensure transport is ready
      setTimeout(() => {
        const { setOnline } = usePresenceStore.getState();
        setOnline();
      }, 500);

      // Load chats for this user
      loadChats();
    }

    // Cleanup on unmount only if user is still logged in
    return () => {
      if (user) {
        const { setOffline } = usePresenceStore.getState();
        setOffline();
      }
    };
  }, [user]);

  return <>{children}</>;
};
