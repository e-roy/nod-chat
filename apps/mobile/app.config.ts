import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Firebase configuration - single source of truth
  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  };

  // Validate that all required fields are present (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const missingFields = Object.entries(firebaseConfig)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    if (missingFields.length > 0) {
      console.warn(
        `Missing Firebase environment variables: ${missingFields.join(', ')}`
      );
    }
  }

  return {
    ...config,
    name: 'MessageAI',
    slug: 'messageai',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.messageai.mobile',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.messageai.mobile',
      googleServicesFile: './GoogleService-Info.plist',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#3B82F6',
        },
      ],
    ],
    extra: {
      firebase: firebaseConfig,
      eas: {
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-expo-project-id',
      },
    },
  };
};
