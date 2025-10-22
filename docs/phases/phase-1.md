**Phase 1 — Project Setup & Authentication**

**ROLE:** You are a senior RN/Expo + Firebase engineer.
**GOAL:** Initialize an Expo (TypeScript) app wired to Firebase (Auth, Firestore, Storage). Implement email/password auth, profile bootstrap, and navigation.

**DO:**

1. Create project structure:

```
apps/mobile (Expo)
packages/shared (types, utils)
```

2. In `apps/mobile`:

- Init Expo (TypeScript). Install: `firebase`, `expo-secure-store`, `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `react-native-safe-area-context`, `react-native-screens`, `@react-native-async-storage/async-storage`, `zustand`.
- Create `src/firebase/firebaseApp.ts` with env-driven config (use `app.config.ts` to inject).
- Create `src/store/auth.ts` (Zustand) to hold `user`, `loading`, methods: `signUp`, `signIn`, `signOut`, `updateProfile`.
- Screens: `AuthScreen`, `ChatListScreen`, `SettingsScreen`, `ProfileSetupScreen`.
- Navigation: stack for Auth → Main (tabs: Chats, Settings).
- On sign-up: create `users/{uid}` with `{displayName, photoURL, online:false, lastSeen:null}`.

- **Install UI libs:**

  ```
  pnpm --filter @chatapp/mobile add @gluestack-ui/themed @gluestack-ui/config @gluestack-style/react
  pnpm --filter @chatapp/mobile add react-native-svg react-native-reanimated react-native-gesture-handler
  npx expo install react-native-safe-area-context react-native-screens
  ```

- **Configure Reanimated:** add `'react-native-reanimated/plugin'` to `babel.config.js` plugins; ensure `import 'react-native-gesture-handler'` at the top of entry.
- **Create UI Provider:** `src/ui/index.tsx` wrapping app with `GluestackUIProvider` and base config from `@gluestack-ui/config`.
- **Use gluestack primitives** for Auth screens (Button, Input, FormControl, Toast).

3. Create **Firestore & Storage Security Rules** (MVP-safe defaults) as `/firebase/rules/firestore.rules` and `/firebase/rules/storage.rules`. Allow only authenticated user to read/write own profile and chats they’re a participant of (will refine later).

4. Add `README` setup: how to create Firebase project, enable Auth (email/password), add web app config, .env instructions.

**FILES to ADD/EDIT (high level names OK):**

- `apps/mobile/app.config.ts` (read env vars into `extra.firebase`)
- `apps/mobile/src/firebase/firebaseApp.ts`
- `apps/mobile/src/store/auth.ts`
- `apps/mobile/src/navigation/index.tsx`
- `apps/mobile/src/screens/{Auth,ChatList,Settings,ProfileSetup}.tsx`
- `firebase/rules/{firestore.rules,storage.rules}`
- `packages/shared/src/types.ts` (User type)

**ACCEPTANCE:**

- Sign up/login flows work; new `users/{uid}` doc created.
- App persists session; reopen app shows Chat List (empty).
- Lint passes; iOS/Android run on simulator/Expo Go.

**SELF-CHECKS:**

- No Firebase config hardcoded; all via `app.config.ts` (env).
- No secret keys in repo.
- Basic unit test for auth store (happy path).
