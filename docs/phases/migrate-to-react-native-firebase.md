# Migrate to react-native-firebase

## Overview

Replace Firebase Web SDK with react-native-firebase to enable native push notifications, better offline support, and improved performance. This migration maintains our transport abstraction layer, so UI code remains unchanged.

## Phase 1: Setup & Configuration

### 1.1 Install react-native-firebase packages

Add core and required modules to `apps/mobile/package.json`:

- `@react-native-firebase/app` (core)
- `@react-native-firebase/auth`
- `@react-native-firebase/firestore`
- `@react-native-firebase/storage`
- `@react-native-firebase/database` (for presence/RTDB)
- `@react-native-firebase/messaging` (for push notifications)

Remove `firebase` web SDK package after migration is complete.

### 1.2 Configure Android

Files to modify: `android/build.gradle`, `android/app/build.gradle`

Add to project-level `build.gradle`:

```gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.4.0'
  }
}
```

Add to app-level `build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'
```

Ensure `google-services.json` exists in `android/app/` (extract from Firebase console if not present).

### 1.3 Configure iOS

Files needed: `ios/Podfile`, `ios/GoogleService-Info.plist`

Since you have `GoogleService-Info.plist` at root, need to:

1. Generate iOS folder: `npx expo prebuild --platform ios`
2. Move `GoogleService-Info.plist` to `ios/ChatApp/` folder
3. Update `Podfile` to include Firebase pods

### 1.4 Update app.config.ts

Add plugin configuration:

```typescript
plugins: ["@react-native-firebase/app", "@react-native-firebase/messaging"];
```

## Phase 2: Migrate Firebase Initialization

### 2.1 Update firebaseApp.ts

File: `apps/mobile/src/firebase/firebaseApp.ts`

Replace Web SDK imports with react-native-firebase:

```typescript
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import database from "@react-native-firebase/database";
```

Remove manual `initializeApp()` - react-native-firebase auto-initializes from native config files.

Update emulator configuration to use react-native-firebase's emulator methods:

```typescript
if (__DEV__) {
  auth().useEmulator("http://10.1.10.90:9099");
  firestore().useEmulator("10.1.10.90", 8080);
  database().useEmulator("10.1.10.90", 9000);
}
```

### 2.2 Export instances correctly

```typescript
export { auth, firestore as db, storage, database as rtdb };
```

## Phase 3: Migrate firebaseTransport.ts

### 3.1 Update Firestore operations

File: `apps/mobile/src/messaging/firebaseTransport.ts`

Key changes:

- `collection()` → `firestore().collection()`
- `doc()` → `firestore().collection().doc()`
- `serverTimestamp()` → `firestore.FieldValue.serverTimestamp()`
- `Timestamp` → `firestore.Timestamp`
- Listener syntax changes slightly (same pattern, different imports)

Example transformation:

```typescript
// Old (Web SDK)
const messageRef = doc(db, "chats", chatId, "messages", msg.id);
await setDoc(messageRef, messageData);

// New (react-native-firebase)
const messageRef = firestore()
  .collection("chats")
  .doc(chatId)
  .collection("messages")
  .doc(msg.id);
await messageRef.set(messageData);
```

### 3.2 Update Auth operations

File: `apps/mobile/src/store/auth.ts`

Change from:

```typescript
import { signInWithEmailAndPassword } from "firebase/auth";
await signInWithEmailAndPassword(auth, email, password);
```

To:

```typescript
import auth from "@react-native-firebase/auth";
await auth().signInWithEmailAndPassword(email, password);
```

Auth state listener changes from `onAuthStateChanged(auth, callback)` to `auth().onAuthStateChanged(callback)`.

### 3.3 Update Storage operations

Any file upload logic needs to use react-native-firebase storage API:

```typescript
const reference = storage().ref(`path/to/file`);
await reference.putFile(localPath);
const url = await reference.getDownloadURL();
```

## Phase 4: Update Presence System

### 4.1 Migrate presence.ts store

File: `apps/mobile/src/store/presence.ts`

Update RTDB operations:

```typescript
// Old
import { ref, onDisconnect, set } from "firebase/database";

// New
import database from "@react-native-firebase/database";

const presenceRef = database().ref(`presence/${userId}`);
await presenceRef.set({ status: "online", lastSeen: Date.now() });
await presenceRef
  .onDisconnect()
  .set({ status: "offline", lastSeen: Date.now() });
```

## Phase 5: Test Migration

### 5.1 Verify core functionality

- Authentication (sign up, sign in, sign out)
- Message sending and receiving
- Chat list updates
- Group messaging
- Presence indicators
- Emulator connectivity in dev mode

### 5.2 Test on both platforms

- Run on Android: `pnpm --filter @chatapp/mobile android`
- Generate iOS folder if needed: `npx expo prebuild --platform ios`
- Run on iOS: `pnpm --filter @chatapp/mobile ios`

## Phase 6: Prepare Push Notification Infrastructure (Not Implemented Yet)

### 6.1 Add notification permission handling

Create placeholder service: `apps/mobile/src/messaging/notificationService.ts`

Structure for future implementation:

```typescript
import messaging from "@react-native-firebase/messaging";

export async function requestNotificationPermission() {
  const authStatus = await messaging().requestPermission();
  return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
}

export async function getDeviceToken() {
  return await messaging().getToken();
}

// Store token in Firestore user document for sending notifications
```

### 6.2 Configure notification handlers (stubs)

- Foreground notification handler
- Background notification handler
- Notification press handler
- Token refresh handler

These will be fully implemented in a future phase when push notifications are ready to be added.

### 6.3 Update app.config.ts for notifications

Add iOS notification permissions:

```typescript
ios: {
  infoPlist: {
    UIBackgroundModes: ['remote-notification'],
  },
}
```

## Phase 7: Cleanup

### 7.1 Remove Firebase Web SDK

Remove from `apps/mobile/package.json`:

- `firebase` package

### 7.2 Update documentation

Update README with new setup instructions for:

- iOS setup requirements
- Android setup requirements
- Firebase config file locations

## Important Notes

### Transport Abstraction Maintained

The `MessagingTransport` interface in `@chatapp/shared` remains unchanged. Only the implementation in `firebaseTransport.ts` changes. All UI code (screens, components) stays the same.

### Breaking Changes

- Syntax changes but functionality remains identical
- Emulator connection must be tested carefully
- Token persistence works differently (better) in native

### Performance Improvements Expected

- Better offline support with automatic sync
- Faster initial load due to native optimizations
- More efficient listeners
- Native-level push notification handling

### Development Workflow Impact

- Pod installation required for iOS changes: `cd ios && pod install`
- Longer initial build times (native compilation)
- Better debugging with native tools when needed
