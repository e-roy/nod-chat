import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'nod-chat',
  slug: 'nod-chat',
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
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.fullstackeric.messageai',
    googleServicesFile: './google-services.json',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['@react-native-firebase/app', '@react-native-firebase/messaging'],
  extra: {
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId:
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
      databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || '',
    },
    eas: {
      projectId: '56a699c7-bcc2-4a48-90d3-24b1719d56d6',
    },
  },
});
