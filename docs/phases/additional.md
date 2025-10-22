Great pick. We only need **light tweaks**:

# What to change

## 1) Cursor rules (update)

Add this block near the top of `.cursorrules.md`:

- **UI Library:** Use **gluestack-ui** with its provider + theme.

  - Packages: `@gluestack-ui/themed`, `@gluestack-ui/config`, `@gluestack-style/react`, plus `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`.
  - **File-size rule:** App code should stay **≤ 350 LOC** where possible. **Exception:** vendor configs and generated UI theme files (gluestack config, tokens) may exceed this limit.
  - **Structure:**

    ```
    apps/mobile/src/ui/
      index.tsx            # Provider + theme
      components/          # thin wrappers: Button, Input, Avatar, Badge, Card, Sheet, Toast
      theme/               # (optional) tokens/overrides
    ```

  - Prefer composing gluestack primitives; avoid re-implementing components.
  - Keep custom component wrappers ≤ 350 LOC; split variants into small files.

(Everything else in the rules stays the same.)

## 2) Phase edits (minimal)

### Phase 1 — Project Setup & Auth (add these tasks)

- **Install UI libs:**

  ```
  pnpm --filter @chatapp/mobile add @gluestack-ui/themed @gluestack-ui/config @gluestack-style/react
  pnpm --filter @chatapp/mobile add react-native-svg react-native-reanimated react-native-gesture-handler
  npx expo install react-native-safe-area-context react-native-screens
  ```

- **Configure Reanimated:** add `'react-native-reanimated/plugin'` to `babel.config.js` plugins; ensure `import 'react-native-gesture-handler'` at the top of entry.
- **Create UI Provider:** `src/ui/index.tsx` wrapping app with `GluestackUIProvider` and base config from `@gluestack-ui/config`.
- **Use gluestack primitives** for Auth screens (Button, Input, FormControl, Toast).

### Phase 2 — 1:1 Messaging (small UI note)

- Use gluestack **Textarea/Input**, **Button**, **HStack/VStack**, **Avatar**, **Badge** to build Composer, bubbles, and chat list tiles.

### Phase 3 — Presence & Read Receipts (UI hint)

- Presence dot = gluestack **Badge** variant.
- Typing indicator = gluestack **Spinner** + subtle text in chat header.

### Phase 4 — Group Chat

- Group header chips with **AvatarGroup** (compose Avatars in HStack).
- Message attribution using **Text** variants and small **Caption** style.

### Phase 5 — Media & Foreground Push

- Image bubbles using gluestack **Image** inside **Card** with rounded corners.
- Use **Actionsheet/Sheet** for media picker options.

No other phase needs structural changes—just use gluestack components where you would have used plain RN views.

---

If you want, I can drop:

- a tiny `src/ui/index.tsx` provider scaffold,
- a `babel.config.js` plugin snippet for Reanimated,
- and a minimal `Button`/`Input` wrapper so Cursor has exact targets.
