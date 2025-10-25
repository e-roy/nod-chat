import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseApp';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Store notification listeners for cleanup
let notificationListener: Notifications.Subscription | null = null;
let responseListener: Notifications.Subscription | null = null;

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('chat_messages', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        lightColor: '#3B82F6',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Get the FCM token for this device
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    // Check if we have permission
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Cannot get FCM token without notification permission');
      return null;
    }

    // Get the Expo project ID from constants
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId || projectId === 'your-expo-project-id') {
      console.warn('No Expo project ID configured. Run: npx eas init');
      console.warn('Skipping push notification setup for now.');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    if (!tokenData?.data) {
      console.warn('Failed to get FCM token');
      return null;
    }

    console.log('FCM Token obtained:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Store the FCM token in Firestore for the current user
 */
export async function storeFCMToken(
  userId: string,
  token: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date(),
      },
      { merge: true }
    );
    console.log('FCM token stored successfully');
  } catch (error) {
    console.error('Error storing FCM token:', error);
    throw error;
  }
}

/**
 * Remove the FCM token from Firestore (on logout)
 */
export async function removeFCMToken(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        fcmToken: null,
        fcmTokenUpdatedAt: new Date(),
      },
      { merge: true }
    );
    console.log('FCM token removed successfully');
  } catch (error) {
    console.error('Error removing FCM token:', error);
    // Don't throw - logout should succeed even if token removal fails
  }
}

/**
 * Initialize notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
): void {
  // Clean up existing listeners
  if (notificationListener) {
    notificationListener.remove();
  }
  if (responseListener) {
    responseListener.remove();
  }

  // Listen for notifications received while app is foregrounded
  notificationListener = Notifications.addNotificationReceivedListener(
    notification => {
      console.log('Notification received (foreground):', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    }
  );

  // Listen for notification taps (both foreground and background)
  responseListener = Notifications.addNotificationResponseReceivedListener(
    response => {
      console.log('Notification tapped:', response);
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    }
  );
}

/**
 * Clean up notification listeners
 */
export function cleanupNotificationListeners(): void {
  if (notificationListener) {
    notificationListener.remove();
    notificationListener = null;
  }
  if (responseListener) {
    responseListener.remove();
    responseListener = null;
  }
}

/**
 * Show a local notification (for foreground messages)
 */
export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Error showing local notification:', error);
  }
}

/**
 * Set badge count (iOS)
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}

/**
 * Complete setup: request permissions, get token, store it
 */
export async function initializeNotifications(
  userId: string
): Promise<string | null> {
  try {
    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return null;
    }

    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      console.warn('Failed to get FCM token');
      return null;
    }

    // Store token in Firestore
    await storeFCMToken(userId, token);

    return token;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return null;
  }
}
