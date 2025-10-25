import { create } from 'zustand';

// Type for network state info
interface NetworkInfo {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
}

// Dynamic import with fallback
let NetInfo: {
  addEventListener: (listener: (state: NetworkInfo) => void) => () => void;
  fetch: () => Promise<NetworkInfo>;
};

try {
  const netInfoModule = require('@react-native-community/netinfo');
  NetInfo = netInfoModule.default;
} catch (error) {
  console.warn('NetInfo module not available, assuming always online');
  // Fallback implementation that assumes always online
  NetInfo = {
    addEventListener: () => () => {},
    fetch: () =>
      Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      }),
  };
}

interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
  isInitialized: boolean;
}

interface NetworkActions {
  setNetworkState: (state: NetworkInfo) => void;
  isOnline: () => boolean;
}

export const useNetworkStore = create<NetworkState & NetworkActions>(
  (set, get) => ({
    isConnected: null,
    isInternetReachable: null,
    type: null,
    isInitialized: false,

    setNetworkState: (state: NetworkInfo) => {
      set({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isInitialized: true,
      });
    },

    isOnline: () => {
      const { isConnected, isInternetReachable } = get();
      // Consider online if connected and internet is reachable
      // If isInternetReachable is null, fall back to isConnected
      if (isInternetReachable !== null) {
        return isConnected === true && isInternetReachable === true;
      }
      return isConnected === true;
    },
  })
);

// Subscribe to network changes immediately when store is created
NetInfo.addEventListener(state => {
  useNetworkStore.getState().setNetworkState(state);
});

// Fetch current network state immediately
NetInfo.fetch().then(state => {
  useNetworkStore.getState().setNetworkState(state);
});
