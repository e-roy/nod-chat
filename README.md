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

### Development Options

This project supports two development approaches:

1. **Local Development with Expo Go** (faster setup, limited native features)
2. **EAS Development Builds** (full native features, requires build step)

**For EAS Development (Recommended):** See [EAS Development Setup Guide](docs/eas-development-setup.md)

**For Local Development:** Continue with the instructions below.

---

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
6. Enable Realtime Database:
   - Go to Realtime Database
   - Create database in test mode
7. Get Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Click "Add app" and select Android
   - Register app with package name: `com.chatapp.mobile`
   - Download `google-services.json` and place it in `apps/mobile/android/app/`
   - For iOS, add iOS app with bundle ID: `com.chatapp.mobile`
   - Download `GoogleService-Info.plist` and place it in `apps/mobile/ios/ChatApp/` (after running `npx expo prebuild --platform ios`)

### 2. Environment Variables

Create a `.env` file in the project root with your Firebase configuration:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
EXPO_PUBLIC_EMULATOR_HOST=10.1.10.90
```

**Important:** Never commit your `.env` file to version control. The `.gitignore` file already excludes it.

### 3. Install Dependencies

```bash
pnpm install
```

### 4. iOS Setup (macOS/Linux only)

If you're on macOS or Linux, generate the iOS project:

```bash
cd apps/mobile
npx expo prebuild --platform ios
```

Then move `GoogleService-Info.plist` to `ios/ChatApp/` folder.

### 5. Android Setup

The `google-services.json` file should be placed in `apps/mobile/android/app/` directory.

**Important:** After cloning the repository, you'll need to create a `local.properties` file in `apps/mobile/android/` to specify your Android SDK location:

#### Option 1: Using the template (Recommended)

```bash
cd apps/mobile/android
cp local.properties.template local.properties
# Edit local.properties and replace YOUR_USERNAME with your actual username
```

#### Option 2: Manual creation

```bash
cd apps/mobile/android
echo "sdk.dir=C:/Users/YOUR_USERNAME/AppData/Local/Android/Sdk" > local.properties
```

#### Option 3: Using Android Studio

1. Open Android Studio
2. Go to File > Project Structure > SDK Location
3. Copy the Android SDK location path
4. Create `local.properties` with: `sdk.dir=YOUR_ACTUAL_SDK_PATH`

**Platform-specific paths:**

- **Windows:** `C:/Users/YOUR_USERNAME/AppData/Local/Android/Sdk`
- **macOS:** `/Users/YOUR_USERNAME/Library/Android/sdk`
- **Linux:** `/home/YOUR_USERNAME/Android/Sdk`

This file is automatically ignored by git and should never be committed to the repository.

### 6. Run the App

```bash
# Start the development server
pnpm dev

# Run on Android
pnpm --filter @chatapp/mobile android

# Run on iOS (macOS/Linux only)
pnpm --filter @chatapp/mobile ios

# Run on web
pnpm --filter @chatapp/mobile web
```

### 7. Firebase Emulators (Optional)

To run with local Firebase emulators:

```bash
# Start emulators
pnpm emulators

# In another terminal, start the app
pnpm dev
```

## Architecture Notes

- **react-native-firebase**: Uses native Firebase SDKs for better performance and offline support
- **Transport Abstraction**: UI code never calls Firebase directly; it uses the `MessagingTransport` interface
- **Feature-first Structure**: Each feature owns its screens, hooks, and services
- **Zustand State Management**: Lightweight state management with stores for auth, chat, groups, and presence
- **gluestack-ui**: Modern, themeable UI components built for React Native

### 5. Multi-Device Development Setup

For testing on multiple devices simultaneously:

#### Start Firebase Emulators

```bash
pnpm run emulators
```

#### iPhone/Physical Device (Expo Go)

```bash
pnpm run dev
```

- Scan QR code with Expo Go app
- Connects to port 8081

#### Android Emulator (Local Network)

```bash
pnpm run dev:tunnel
```

- Open Expo Go on Android emulator
- Scan QR code from development server
- **Or manually enter**: `exp://10.1.10.90:8082` (replace with your computer's IP)
- Connects to port 8082
- Uses local network for better stability and multiple device support

#### Complete Development Workflow

1. **Terminal 1**: `pnpm run emulators` (Firebase emulators)
2. **Terminal 2**: `pnpm run dev` (iPhone/Expo Go)
3. **Terminal 3**: `pnpm run dev:tunnel` (Android emulator)

Both devices will connect to the same Firebase emulators, allowing you to test real-time messaging between iPhone and Android emulator.

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
pnpm dev                    # Start Expo development server (Expo Go)
pnpm dev:tunnel             # Start Expo server for Android emulator (local network)
pnpm --filter @chatapp/mobile dev:client  # Start with development client
pnpm run emulators          # Start Firebase emulators
pnpm --filter @chatapp/mobile android  # Run on Android
pnpm --filter @chatapp/mobile ios      # Run on iOS
pnpm --filter @chatapp/mobile web      # Run on Web

# EAS Development Builds
pnpm --filter @chatapp/mobile build:dev:android   # Build dev client for Android
pnpm --filter @chatapp/mobile build:dev:ios       # Build dev client for iOS
pnpm --filter @chatapp/mobile build:preview:android  # Build preview for Android
pnpm --filter @chatapp/mobile build:preview:ios     # Build preview for iOS

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
