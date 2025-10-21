A production-grade Expo (React Native) + Firebase messaging app with clean, scalable architecture.

## Project Structure

```
/apps
  /mobile                 # Expo app (React Native)
    /src
      /app                # entry, providers, navigation
      /ui                 # gluestack provider, theme, component wrappers
        /components       # Button, Input, Avatar, Badge, Card, Sheet, Toast, etc.
        /theme            # tokens, overrides, config (vendor files can exceed 350 LOC)
      /features
        /auth             # screens, hooks, services for authentication
        /chat             # chat list, chat screen, composer, message bubbles
        /presence         # online/offline indicators, typing
        /groups           # group creation, membership, group chat
        /media            # image picker, upload pipeline, viewer
        /settings         # profile, preferences
      /messaging
        transport.ts      # interface (connect, send, onMessage, requestHistory)
        firebaseTransport.ts
        // (room to add another transport later without changing UI)
      /firebase
        firebaseApp.ts    # initializeApp using env from app.config.ts
        rules/            # firestore.rules, storage.rules (MVP-safe defaults)
      /store              # zustand stores: auth, chat list, messages, connection
      /utils              # ids, time, env, logger, validation
      /types              # shared app types (re-export from /packages/shared if needed)

/packages
  /shared                 # reusable TS types & pure utilities (no RN deps)

/services                 # reserved for backend services (empty for now)
/infra                    # reserved for local tooling, docker, scripts (empty for now)
```

## Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password"
4. Enable Firestore Database:
   - Go to Firestore Database
   - Create database in test mode (we'll update rules later)
5. Enable Storage:
   - Go to Storage
   - Get started with default rules
6. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Click "Add app" > Web app
   - Copy the config object

### 2. Environment Variables

Create a `.env` file in the `apps/mobile` directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Important:** Never commit your `.env` file to version control. The `.gitignore` file already excludes it.

### 3. Install Dependencies

```bash
# Install all dependencies
pnpm install

# Install mobile app dependencies
pnpm --filter @chatapp/mobile add firebase expo-secure-store @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-safe-area-context react-native-screens @react-native-async-storage/async-storage zustand

# Install UI dependencies
pnpm --filter @chatapp/mobile add @gluestack-ui/themed @gluestack-ui/config @gluestack-style/react react-native-svg react-native-reanimated react-native-gesture-handler
```

### 4. Run the App

```bash
# Start the development server
pnpm dev

# Or run specific platforms
pnpm --filter @chatapp/mobile android
pnpm --filter @chatapp/mobile ios
pnpm --filter @chatapp/mobile web
```

### 5. Deploy Firebase Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Deploy rules
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## Development

### Available Scripts

```bash
# Development
pnpm dev                    # Start Expo development server
pnpm --filter @chatapp/mobile android  # Run on Android
pnpm --filter @chatapp/mobile ios      # Run on iOS
pnpm --filter @chatapp/mobile web      # Run on Web

# Code Quality
pnpm --filter @chatapp/mobile lint     # Run ESLint
pnpm --filter @chatapp/mobile lint:fix # Fix ESLint issues
pnpm --filter @chatapp/mobile format   # Format code with Prettier
pnpm --filter @chatapp/mobile typecheck # TypeScript type checking

# Testing
pnpm --filter @chatapp/mobile test     # Run tests
pnpm --filter @chatapp/mobile test:watch # Run tests in watch mode

# Build
pnpm --filter @chatapp/mobile build    # Build for production
```

## Features Implemented (Phase 1)

- ✅ Project structure with monorepo setup
- ✅ Expo TypeScript app with Firebase integration
- ✅ Email/password authentication
- ✅ User profile creation and management
- ✅ Navigation with Auth stack and Main tabs
- ✅ gluestack-ui components and theming
- ✅ Zustand state management
- ✅ Firebase security rules (MVP-safe defaults)
- ✅ Session persistence
- ✅ ESLint + Prettier code quality tools
- ✅ Basic unit tests for auth store
- ✅ Firebase rules properly organized

## Tech Stack

- **Expo** (latest SDK)
- **React Navigation** (native stack + bottom tabs)
- **State**: **Zustand**
- **Storage/Offline**: `@react-native-async-storage/async-storage`
- **Firebase Web SDK** (Auth, Firestore, Storage)
- **UI**: **gluestack-ui** (`@gluestack-ui/themed`, `@gluestack-ui/config`, `@gluestack-style/react`)
- **Core RN deps**: `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`
- **Testing**: `@testing-library/react-native`, `jest-expo`
- **Code Quality**: ESLint, Prettier, TypeScript

## Architecture

- **Package manager:** `pnpm` (workspaces)
- **Architecture:** feature-first folders, small modules, pluggable messaging transport
- **Rule of 350:** Keep app source files **≤ 350 LOC** when reasonable
- **TypeScript strict** mode enabled
- **Absolute imports** via `tsconfig` paths (`@/ui/...`, `@/features/chat/...`, etc.)

## Next Steps (Phase 2)

- Implement messaging transport interface
- Create Firebase messaging transport
- Build chat list and chat screen
- Add message composition and display
- Implement real-time messaging
