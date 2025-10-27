A production-grade Expo (React Native) + Firebase messaging app with AI-powered features for remote teams. Clean architecture with comprehensive real-time messaging, intelligent chat analysis, and seamless user experience.

## Project Structure

```
/apps
  /mobile                 # Expo app (React Native)
    /src
      /components         # UI components (chat, groups, AI, calendar)
        /ui               # gluestack-ui implementations (Button, Input, Toast, etc.)
        /ai-sheet         # AI features action sheet components
        /calendar         # Calendar view components (day/week/list)
      /screens            # Screen components (Auth, Chat, Groups, Priorities, Calendar, Settings)
      /messaging          # Messaging infrastructure
        firebaseTransport.ts
        mediaUpload.ts
        audioRecording.ts
        notifications.ts
        typing.ts
      /store              # Zustand stores (auth, chat, groups, ai, presence, network, outbox, theme, settings, preferences)
      /navigation         # React Navigation setup
      /firebase           # Firebase initialization
      /utils              # Helper functions
      /types              # TypeScript definitions

/functions                # Firebase Functions (Cloud Functions)
  /src
    /ai                   # AI analysis (genkit + Google AI)
    /messaging.ts         # Message triggers and notifications
    /presence.ts          # Online/offline presence handling

/packages
  /shared                 # Reusable TypeScript types & utilities (no RN deps)
  /scripts                # Development utilities and seed scripts
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
6. Enable Cloud Functions (for AI features):
   - Go to Functions
   - Follow setup wizard to initialize Functions
   - Requires billing account (Blaze plan for emulator support)
7. Get your Firebase config:
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
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

EXPO_PUBLIC_EMULATOR_HOST=10.1.10.90
```

**Important:** Never commit your `.env` file to version control. The `.gitignore` file already excludes it.

For AI features, also create a `.env.local` file in the `functions` directory:

```env
GOOGLE_API_KEY=your_google_ai_api_key_here
```

Note: AI features are optional and will gracefully degrade if the API key is not set.

### 3. Firebase Functions Setup (Optional)

If you want to use AI features:

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Create .env.local file with your Google AI API key
echo "GOOGLE_API_KEY=your_google_ai_api_key_here" > .env.local

# Build functions
npm run build
```

**Note:** Functions must be built before starting emulators if you plan to use AI features. Without the Google AI API key, the app will work but AI features will be disabled.

### 4. Install Dependencies

```bash
# Install all dependencies
pnpm install

# Install mobile app dependencies
pnpm --filter @chatapp/mobile add firebase expo-secure-store @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-safe-area-context react-native-screens @react-native-async-storage/async-storage zustand

# Install UI dependencies
pnpm --filter @chatapp/mobile add @gluestack-ui/themed @gluestack-ui/config @gluestack-style/react react-native-svg react-native-reanimated react-native-gesture-handler
```

### 5. Run the App

```bash
# Start the development server
pnpm dev

# Or run specific platforms
pnpm --filter @chatapp/mobile android
pnpm --filter @chatapp/mobile ios
pnpm --filter @chatapp/mobile web
```

### 6. Development Workflow

For testing on multiple devices simultaneously:

#### Complete Development Workflow (3 Terminals)

**Terminal 1 - Firebase Emulators:**

```bash
pnpm run emulators
```

- Starts Auth, Firestore, Functions, and Storage emulators
- Ensure emulators are fully started before launching app
- Functions must be built first if using AI features

**Terminal 2 - iOS/Expo Go:**

```bash
pnpm run dev
```

- Starts Expo dev server on port 8081
- Scan QR code with Expo Go app
- For iPhone: Use Camera app to scan
- For physical Android device: Use Expo Go app

**Terminal 3 - Android Emulator (Optional):**

```bash
pnpm run dev:tunnel
```

- Starts Expo dev server on port 8082 (local network)
- Open Expo Go on Android emulator
- Scan QR code or manually enter: `exp://10.1.10.90:8082` (replace with your computer's IP)

#### Troubleshooting Tips

- **Emulators not connecting:** Check `EXPO_PUBLIC_EMULATOR_HOST` matches your machine's IP address
- **AI features not working:** Ensure Functions are built (`npm run build` in `functions/` directory)
- **Connection errors:** Verify emulators are fully started before launching the app
- **Multiple devices:** Both devices connect to the same Firebase emulators for real-time testing

### 7. Deploy Firebase Rules (Production)

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
pnpm dev                    # Start Expo development server (iPhone/Expo Go)
pnpm dev:tunnel             # Start Expo server for Android emulator (local network)
pnpm run emulators          # Start Firebase emulators
pnpm run emulators:auth     # Start only Auth emulator
pnpm run emulators:firestore # Start only Firestore emulator
pnpm --filter @chatapp/mobile android  # Run on Android
pnpm --filter @chatapp/mobile ios      # Run on iOS
pnpm --filter @chatapp/mobile web      # Run on Web

# Data Seeding
pnpm run seed               # Seed all test data
pnpm run seed:chats         # Seed test chat conversations
pnpm run seed:groups        # Seed test group chats

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

# Firebase Deployment
pnpm run deploy:firestore   # Deploy Firestore rules
pnpm run deploy:storage     # Deploy Storage rules
```

## Features Implemented

### AI-Powered Features

- ✅ **Chat summarization** - Generate concise summaries of conversation threads
- ✅ **Action item extraction** - Automatically detect and track tasks with assignees
- ✅ **Decision tracking** - Surface key decisions made in conversations
- ✅ **Semantic search** - Natural language search across messages
- ✅ **Priority detection** - Auto-flag urgent messages and deadlines
- ✅ **Calendar extraction** - Detect and extract meeting times and events
- ✅ **User-wide priorities view** - See all urgent items across chats
- ✅ **User-wide calendar view** - Unified calendar from all conversations

### UI & UX

- ✅ Dark/light theme support
- ✅ gluestack-ui component library
- ✅ Responsive layouts with safe area handling
- ✅ Loading states and error handling
- ✅ Pull-to-refresh on lists
- ✅ Skeleton loaders
- ✅ Bottom tab navigation (Chats, Groups, Priorities, Calendar, Settings)

### Architecture & Code Quality

- ✅ Monorepo with pnpm workspaces
- ✅ TypeScript strict mode
- ✅ Pluggable messaging transport layer
- ✅ Zustand state management
- ✅ Firebase Functions with AI (genkit + Google AI)
- ✅ Firebase security rules
- ✅ ESLint + Prettier

## AI Features

This app includes powerful AI features designed for remote team professionals, built with Firebase Functions, Genkit, and Google AI.

### 1. Chat Summarization

Generates concise summaries of conversation threads to quickly catch up on discussions.

- **Access**: Tap AI button (sparkles icon) in chat header → Summary tab
- **Backend**: Firebase Function analyzes last 100 messages
- **Caching**: Results cached in Firestore (`chatAI/{chatId}`)
- **Use case**: Get up to speed on long threads without reading everything

### 2. Action Item Extraction

Automatically detects tasks, assignments, and to-dos from conversations.

- **Access**: Tap AI button in chat header → Actions tab
- **Features**:
  - Assignee detection (identifies who's responsible)
  - Status tracking (pending/completed)
  - Due date extraction from messages
- **Backend**: NLP analysis extracts actionable items from free-form text
- **Use case**: Never lose track of action items from team discussions

### 3. Decision Tracking

Surfaces key decisions and agreements made in conversations.

- **Access**: Tap AI button in chat header → Decisions tab
- **Features**: Groups decisions by subject/topic for easy reference
- **Backend**: Extracts explicit and implicit decisions from messages
- **Use case**: Quickly reference past agreements without searching history

### 4. Semantic Search

Natural language search that understands meaning, not just keywords.

- **Access**: Tap AI button in chat header → Search tab
- **Features**:
  - Ranked results with relevance scores
  - Snippet previews showing context
- **Backend**: Embedding-based semantic matching using Google AI
- **Use case**: Find messages by concept, not exact word matches

### 5. Priority Detection & Calendar Extraction

Real-time analysis of new messages to detect urgency and extract calendar events.

**Priority Detection**: Auto-flags urgent messages, deadlines, blockers

- View in-chat: Tap priority indicator (alert icon) in header
- View all: "Priorities" tab in bottom navigation shows all urgent items across chats
- Provides reasons for why message was flagged
- Supports high/urgent priority levels

**Calendar Extraction**: Detects dates, times, meeting information

- Automatically extracts: dates, times, meeting titles, participants
- View in-chat: Tap calendar button in header
- View all: "Calendar" tab in bottom navigation shows unified calendar from all conversations
- Supports multiple calendar views: day, week, list
- Events include source chat and message links

### AI Setup Requirements

- Google AI API key (set in `functions/.env.local`)
- Firebase Functions deployed or running in emulator
- Functions must be built before starting emulators
- AI features gracefully degrade if API key is not configured
- See "Firebase Functions Setup (Optional)" section above

## Tech Stack

### Mobile App

- **Expo** (latest SDK)
- **React Navigation** (native stack + bottom tabs)
- **State**: **Zustand**
- **Storage/Offline**: `@react-native-async-storage/async-storage`
- **Firebase Web SDK** (Auth, Firestore, Storage, Functions)
- **UI**: **gluestack-ui** (`@gluestack-ui/themed`, `@gluestack-ui/config`, `@gluestack-style/react`)
- **Icons**: **lucide-react-native**
- **Audio**: **expo-av** (voice messages)
- **Core RN deps**: `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`
- **Testing**: `@testing-library/react-native`, `jest-expo`
- **Code Quality**: ESLint, Prettier, TypeScript

### Backend & AI

- **Firebase Functions** (Cloud Functions)
- **Firebase Genkit** (AI framework)
- **Google AI** (Gemini - chat summarization, search, detection)
- **Firebase Emulators** (local development)

## Architecture

- **Package manager:** `pnpm` (workspaces)
- **Architecture:** Component-based with separate screens, stores, and messaging infrastructure
- **Rule of 350:** Keep app source files **≤ 350 LOC** when reasonable (exceptions: generated/vendor files like theme configs)
- **TypeScript strict** mode enabled
- **Absolute imports** via `tsconfig` paths (`@/` for src root)
- **State management:** Zustand stores for auth, chat, groups, AI, presence, network, theme, settings
- **Pluggable transport:** Abstract messaging layer allows swapping Firebase for other backends
- **AI integration:** Firebase Functions with Genkit provide server-side AI analysis
