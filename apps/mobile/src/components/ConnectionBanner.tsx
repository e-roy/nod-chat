import React, { useEffect, useState } from 'react';
import { Alert, AlertText } from '@ui/alert';
import { Box } from '@ui/box';
import { useNetworkStore } from '@/store/network';

export const ConnectionBanner: React.FC = () => {
  const { isInitialized } = useNetworkStore();
  const [showReconnecting, setShowReconnecting] = useState(false);
  const [previouslyOffline, setPreviouslyOffline] = useState(false);

  const isOnline = useNetworkStore(state => state.isOnline());

  useEffect(() => {
    if (!isInitialized) return;

    if (!isOnline && !previouslyOffline) {
      // Just went offline
      setPreviouslyOffline(true);
      setShowReconnecting(false);
    } else if (isOnline && previouslyOffline) {
      // Just came back online
      setShowReconnecting(true);
      setPreviouslyOffline(false);

      // Hide reconnecting banner after 3 seconds
      const timer = setTimeout(() => {
        setShowReconnecting(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, isInitialized, previouslyOffline]);

  // Don't show anything until network state is initialized
  if (!isInitialized) {
    return null;
  }

  // Show offline banner
  if (!isOnline) {
    return (
      <Box className="w-full">
        <Alert action="warning" variant="solid">
          <AlertText>Offline - Messages will be sent when online</AlertText>
        </Alert>
      </Box>
    );
  }

  // Show reconnecting banner briefly
  if (showReconnecting) {
    return (
      <Box className="w-full">
        <Alert action="success" variant="solid">
          <AlertText>Back online</AlertText>
        </Alert>
      </Box>
    );
  }

  return null;
};
