awesome — here are ready-to-paste **Cursor prompts** for each phase. run them one phase at a time. each prompt tells Cursor what to create/modify, success criteria, and self-checks.

---

# 🟩 MVP PHASES

---

### Cursor Prompt — **Phase 1 — Project Setup & Authentication**

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
- Add basic UI (no heavy styling) with form validation.

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

---

### Cursor Prompt — **Phase 2 — One-on-One Messaging**

**ROLE:** Expo + Firebase engineer.
**GOAL:** Real-time 1:1 text chat with optimistic UI and persistence.

**DO:**

1. Data model (Firestore):

```
chats/{chatId}:
  participants: [uidA, uidB]
  lastMessage: { id, text, senderId, createdAt }
  updatedAt: serverTimestamp

chats/{chatId}/messages/{messageId}:
  id, senderId, text, imageUrl?, createdAt(serverTimestamp), status('sending'|'sent'|'delivered'|'read')
```

- `chatId` = sorted `uidA_uidB`.

2. Create `MessagingTransport` abstraction:

- `packages/shared/src/messaging/types.ts`:

```ts
export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  imageUrl?: string | null;
  createdAt: number;
  status?: "sending" | "sent" | "delivered" | "read";
};
export interface MessagingTransport {
  connect(uid: string): Promise<void>;
  send(msg: ChatMessage): Promise<void>;
  onMessage(chatId: string, cb: (m: ChatMessage) => void): () => void;
  requestHistory(chatId: string, limit?: number): Promise<ChatMessage[]>;
}
```

- Implement `FirebaseTransport` in `apps/mobile/src/messaging/firebaseTransport.ts`.

3. UI:

- `ChatListScreen` shows chats with preview & timestamp (listen to `chats` where `participants` contains current uid).
- `ChatScreen`: composer + list. On send:

  - Create client UUID.
  - Write to `messages` with temporary local state `status:'sending'`.
  - Update `chats/{chatId}.lastMessage` and `updatedAt`.
  - On write success, status → `sent` (listener updates).

4. Persistence:

- Enable Firestore offline persistence.
- Ensure messages rehydrate on app restart.

5. Update rules to allow a user to read/write only chats they participate in.

**ACCEPTANCE:**

- Two emulator users exchange messages instantly.
- Optimistic message appears immediately, becomes “sent”.
- Restart app → chat history still visible.

**SELF-CHECKS:**

- No UI component directly calls Firestore; only via `FirebaseTransport` + a thin `useChat` hook.

---

### Cursor Prompt — **Phase 3 — Presence & Read Receipts**

**ROLE:** Expo + Firebase engineer.
**GOAL:** Show online/offline presence, typing, and read receipts.

**DO:**

1. Presence:

- Use Realtime Database for presence and mirror to Firestore:

  - RTDB path `/status/{uid} = { state:'online'|'offline', lastChanged:timestamp }`.
  - On connect/disconnect, update appropriately.
  - Cloud Function mirrors to `users/{uid}.online` and `lastSeen`.

- Chat List and headers subscribe to `users` docs to show presence.

2. Typing indicators:

- Collection `typing/{chatId}/{uid}` boolean.
- Debounce keystrokes; set true on input, set false after idle (e.g., 2s) or unmount.

3. Read receipts:

- When a user views a chat, batch update all their incoming, latest N unread messages in that chat: `status:'read'` and add `readAt`.
- Sender side: show single check (sent), double check (delivered), bold double (read). For MVP, delivered = recipient wrote to local cache (simplify via listener event).

**FILES:**

- `cloud/functions/presence.ts` (RTDB ↔ Firestore mirror)
- `apps/mobile/src/store/presence.ts`
- `apps/mobile/src/messaging/typing.ts`

**ACCEPTANCE:**

- Presence toggles within ~2s as users open/close app.
- Typing indicator visible while the other user types.
- Read receipts update when chat is open on recipient device.

**SELF-CHECKS:**

- Presence works even if app crashes (onDisconnect handler).
- Typing entries are ephemeral; cleaned on unmount.

---

### Cursor Prompt — **Phase 4 — Group Chat**

**ROLE:** Expo + Firebase engineer.
**GOAL:** Create & use groups (3+ users), with attribution and basic read tracking.

**DO:**

1. Data model:

```
groups/{groupId}: { name, photoURL?, members:[uid], updatedAt, lastMessage }
groups/{groupId}/messages/{messageId}:
  id, senderId, text?, imageUrl?, createdAt, readBy:[uid]
```

2. Screens:

- Group List, Group Chat, Group Create (select multiple users).
- In message list, show sender avatar/name per message.

3. Logic:

- On send, optimistic insert; update `readBy` with sender immediately.
- When a member opens group chat, mark recent messages `readBy += uid`.
- List groups where `members` contains current uid.

4. Rules:

- Only members can read/write; only admins (creator) can add/remove.

**ACCEPTANCE:**

- 3 users can chat together; names/avatars visible.
- `readBy` updates when a member views chat.

**SELF-CHECKS:**

- Prevent non-members from accessing group data.
- Leave group removes membership and access.

---

### Cursor Prompt — **Phase 5 — Media & Foreground Push** **(🟢 LAST PHASE OF MVP)**

**ROLE:** Expo + Firebase engineer.
**GOAL:** Image messaging + foreground notifications (Expo + FCM).

**DO:**

1. Media:

- Integrate `expo-image-picker`; upload to Firebase Storage under `chatMedia/{chatId}/{uuid}.jpg`.
- Add upload progress UI; message includes `imageUrl`.
- Thumbnails in chat bubbles; tap to open full.

2. Foreground notifications:

- Configure Expo Notifications + FCM.
- On new message in **non-active chat**, show a local foreground notification with sender name & snippet.

3. Rules:

- Storage rules: only chat participants can read media in that chat; only senders can write.

**ACCEPTANCE:**

- Users can send/receive images with preview.
- Foreground notifications fire for new messages in other chats.

**SELF-CHECKS:**

- No PII leaks in notifications beyond minimal preview (config flag to disable previews).

---

# 🟦 FULL FEATURE COMPLETION PHASES

---

### Cursor Prompt — **Phase 6 — Offline & Persistence**

**ROLE:** Reliability engineer.
**GOAL:** Robust offline behavior; message queueing and resend.

**DO:**

1. Enable Firestore persistence if not already.
2. Implement a tiny `outbox` in local storage for unsent messages. On reconnect, retry send (idempotent by `id`).
3. Add banners/toasts for offline/online; disable send when offline but queue allowed.
4. Crash-safe: simulate app kill during send; message must deliver after restart.

**ACCEPTANCE:**

- Send offline → message delivers on reconnect without duplicates.
- History is readable offline.

**SELF-CHECKS:**

- Idempotent sends (same `id` doesn’t create duplicates).
- Graceful backoff on repeated failures.

---

### Cursor Prompt — **Phase 7 — Media Enhancements**

**ROLE:** Client engineer.
**GOAL:** Multiple images, video, metadata, UX polish.

**DO:**

- Multi-select images; video upload with basic compression.
- Show upload progress, retry failed uploads.
- Store metadata `{size, mime, width, height, duration?}`.
- Improve media viewer (pinch to zoom for images).

**ACCEPTANCE:**

- Multiple images send in one action; progress is visible.
- Videos play inline; metadata present.

**SELF-CHECKS:**

- Respect mobile data constraints (warn for large uploads).

---

### Cursor Prompt — **Phase 8 — Background Push & Deep Links**

**ROLE:** Mobile notifications engineer.
**GOAL:** Full background push and deep-link into specific chat.

**DO:**

- Configure FCM server key + Expo Push service for background pushes.
- Cloud Function on new message sends push to offline recipients.
- Tap notification opens target chat via deep link; mark as delivered/read accordingly.
- Optional: silent push to pre-sync last N messages.

**ACCEPTANCE:**

- App closed → receives push; tap opens correct chat.
- Delivery/read updates reconcile after open.

**SELF-CHECKS:**

- No duplicate notifications for the same message.
- Opt-out toggle in Settings works.

---

### Cursor Prompt — **Phase 9 — Profiles & Settings**

**ROLE:** Product engineer.
**GOAL:** Editable profiles and basic settings.

**DO:**

- Profile edit screen (name, avatar, status message).
- Propagate profile changes to chat headers & lists.
- Settings: dark mode, notification toggle, sign out.
- Local persistence for settings.

**ACCEPTANCE:**

- Profile changes reflect across the app.
- Settings persist through restarts.

**SELF-CHECKS:**

- Avatar upload respects Storage rules; previous avatar cleaned up.

---

### Cursor Prompt — **Phase 10 — Security & Rules Hardening** **(🟦 LAST PHASE OF ALL FEATURES)**

**ROLE:** Security-minded Firebase engineer.
**GOAL:** Lock down Firestore/Storage rules and inputs.

**DO:**

- Write precise Firestore rules:

  - Users can read their own profile + profiles of contacts.
  - Chat doc readable only by participants; message write only by authenticated participant.
  - Group membership gates reads/writes.

- Storage rules tied to chat/group membership.
- Client-side input validation and sanitization.
- Add basic analytics (screen views, message send).

**ACCEPTANCE:**

- Manual attempts to read/write others’ chats fail.
- Automated rule tests pass.

**SELF-CHECKS:**

- No publicly readable buckets/collections.
- Queries are indexed; no missing index errors.

---

# 🟧 BEYOND PHASES

---

### Cursor Prompt — **Phase 11 — Hybrid Pivot: ejabberd Transport** **(🟧 LAST PHASE BEYOND)**

**ROLE:** Architect bridging Firebase ↔ XMPP.
**GOAL:** Keep UI & Firestore metadata, replace message transport with ejabberd (XMPP over WebSocket) behind a pluggable interface.

**DO:**

1. Server (doc only for now):

- Provide `docker-compose` for ejabberd + Postgres with modules: WebSocket, Stream Management (XEP-0198), Message Archive (XEP-0313), MUC, Receipts (XEP-0184).
- Sketch Node/CF function to receive ejabberd webhooks (message_received) → send FCM + update Firestore `chats/{chatId}.lastMessage`.

2. Client:

- Keep `MessagingTransport` interface. Create `xmppTransport.ts` using `@xmpp/client`.
- Map:

  - `send` → XMPP message stanza.
  - `onMessage` → stanza listener.
  - `requestHistory` → MAM query (last N).
  - Delivery/read → receipts & chat state mapping.

- Feature flag: `USE_XMPP=true` switches transports.

3. Firestore:

- Continue to use Firestore for: auth, user profiles, chat metadata (lastMessage, updatedAt, unread counts).
- Stop writing message bodies to Firestore when XMPP enabled.

**ACCEPTANCE:**

- With `USE_XMPP=true`, two users can chat as before; UI unchanged.
- Foreground push via ejabberd→Function→FCM works.
- Message history loads from MAM.

**SELF-CHECKS:**

- Idempotent message IDs across transports.
- Clean disconnect/reconnect with Stream Management resume.

---

## One more helpful prompt (optional): **Common Utilities & Theming**

**ROLE:** DX/Productivity engineer.
**GOAL:** Create shared UI atoms and utilities to reduce repetition.

**DO:**

- Add `packages/shared-ui` with basic components: `Avatar`, `MessageBubble`, `Composer`, `ScreenHeader`, `PresenceDot`, `IconCheck`, `IconDoubleCheck`.
- Add date/time util (format relative time).
- Add theme (dark/light) tokens.

**ACCEPTANCE:**

- Chat screens refactored to use shared components.
- Theming toggles correctly.

---

## How to run these phases in Cursor

- Paste one phase prompt at a time.
- Let Cursor propose file diffs; accept/review iteratively.
- Keep commits per phase (`feat: Phase X`).

If you want, I can also generate **starter files** for Phase 1 (minimal code scaffolds, env templates, and initial rules) so Cursor has concrete targets to fill in.

---

awesome — here are **Cursor-ready prompts** for the three ejabberd phases. paste and run them one phase at a time.

---

## Cursor Prompt — **Phase 11 — ejabberd Server Setup**

**ROLE:** You are a senior DevOps engineer setting up **ejabberd + Postgres** for local/dev use with WebSocket, MAM, Stream Management, MUC, Receipts, Webhooks, and HTTP API. No mobile app changes yet.

**GOAL:** A reproducible local stack reachable at `ws://localhost:5280/xmpp-websocket` with persistence in Postgres and a basic admin.

**DO:**

1. Create `infra/xmpp/docker-compose.yml` with two services:

   - `postgres:15` (volume for data, env for user/pass/db)
   - `ejabberd` (latest community), mount `ejabberd.yml`, expose `5222` (optional), `5280` (http/websocket), link to Postgres.

2. Add `infra/xmpp/ejabberd.yml` minimal config:

   - `hosts: ["localhost"]`
   - `loglevel: 4`
   - **listen**:

     - `5280` `ejabberd_http` with `websocket`, `api`, `admin` enabled.

   - **auth**: `auth_method: sql` with Postgres DSN (from env).
   - **default DB**: `sql_type: pgsql`, enable MAM to SQL.
   - **modules** (enable and configure):

     - `mod_mam: { default: always, cache_size: 0 }`
     - `mod_stream_mgmt: { resend_on_timeout: 1 }`
     - `mod_receipts: { }`
     - `mod_carboncopy: { }`
     - `mod_muc: { default_room_options: { persistent: true, mam: true } }`
     - `mod_last: { }`
     - `mod_roster: { versioning: true }`
     - `mod_vcard: { }`
     - `mod_push: { }`
     - `mod_webhooks: { outgoing: [{ url: "http://localhost:8787/ejabberd/webhook", headers: [{"X-Webhook-Token":"dev-secret"}], events: [message, muc_message] }] }`
     - `mod_http_api: { }`

   - Disable s2s for dev: `s2s_use_starttls: optional`, or `disable_s2s: true`.

3. Create `infra/xmpp/.env.example`:

   ```
   PGUSER=ejabberd
   PGPASSWORD=ejabberd
   PGDATABASE=ejabberd
   PGHOST=postgres
   PGPORT=5432
   EJABBERD_ADMIN=admin
   EJABBERD_ADMIN_PASS=admin123
   EJABBERD_DOMAIN=localhost
   WEBHOOK_TOKEN=dev-secret
   ```

4. Add a tiny init script `infra/xmpp/init.sh` executed after up:

   - Wait for ejabberd to start.
   - Use **HTTP API** to register admin: `admin@localhost`.
   - Create two test users: `alice@localhost`, `bob@localhost`.
   - Verify by creating a direct message between them via `send_stanza` or quick CLI `ejabberdctl` if available in container.

5. Add `infra/README.md` with:

   - `docker compose up -d`
   - Admin UI at `http://localhost:5280/admin` (login as `admin@localhost`).
   - WebSocket endpoint: `ws://localhost:5280/xmpp-websocket`
   - How to tail logs / reset DB.

**FILES TO ADD/EDIT:**

- `infra/xmpp/docker-compose.yml`
- `infra/xmpp/ejabberd.yml`
- `infra/xmpp/.env.example`
- `infra/xmpp/init.sh`
- `infra/README.md`

**ACCEPTANCE:**

- `docker compose up -d` brings up Postgres + ejabberd with no errors.
- Can log into **Admin** at `http://localhost:5280/admin` as `admin@localhost`.
- Using any desktop XMPP client (e.g., Gajim) with `alice@localhost` / `bob@localhost`, messages send, **MAM** stores history, **receipts** arrive.
- WebSocket endpoint responds at `ws://localhost:5280/xmpp-websocket`.

**SELF-CHECKS:**

- MAM writes to Postgres (confirm tables populated).
- Disconnect/reconnect preserves session via **Stream Management** (no message loss).
- Webhooks fire to the configured URL (even if 404 for now).

---

## Cursor Prompt — **Phase 12 — XMPP Transport Integration (Hybrid Client)**

**ROLE:** You are a senior Expo engineer integrating an **XMPP transport** into the existing app while keeping Firebase for auth, profiles, and chat metadata. Transport is **pluggable** behind `MessagingTransport`. Do not remove Firebase transport yet; add a flag to switch.

**GOAL:** App can send/receive messages via ejabberd (WebSocket), load recent history via MAM, and keep UI unchanged. Auth still via Firebase; use a simple dev mapping from Firebase `uid` → XMPP JID `uid@localhost`.

**DO:**

1. Add env toggle: `USE_XMPP=true|false` in `apps/mobile/app.config.ts` (and `.env.example`).
2. Create `apps/mobile/src/messaging/xmppTransport.ts` implementing existing `MessagingTransport`:

   - Use `@xmpp/client`.
   - Connect to `ws://localhost:5280/xmpp-websocket`.
   - JID: `${uid}@localhost`; for **dev**, password = uid (or a temp mapping). We’ll harden later.
   - Handle events: `online`, `stanza`, `error`, `offline`.
   - `send(msg)`: send `<message to='peer@localhost' type='chat'><body>...</body><request xmlns='urn:xmpp:receipts'/></message>`
   - `onMessage(chatId, cb)`: listen for incoming `<message>` stanzas; map to `ChatMessage`.
   - `requestHistory(chatId)`: query **MAM** (`urn:xmpp:mam:2`) for last N messages for that peer or room; map to `ChatMessage[]`.
   - Receipts: respond with `<received xmlns='urn:xmpp:receipts' id='...'/>` when receiving a message that requests receipts.

3. Wire transport toggle:

   - In the place where `FirebaseTransport` is created, conditionally create `XmppTransport` if `USE_XMPP=true`.
   - Keep UI components intact; they should only talk to `MessagingTransport`.

4. Connection state UX:

   - Add small banner / dot to show `connecting / connected / disconnected`.
   - Auto-reconnect with exponential backoff.

5. Developer tools:

   - Add a dev-only logger to print stanzas to console for debugging.

6. Chat ID mapping:

   - For 1:1 chats, standardize `chatId = sort(uidA, uidB).join('_')`.
   - Map to XMPP JIDs by converting `uid` to `uid@localhost` when building `to`/`from`.

**FILES TO ADD/EDIT:**

- `apps/mobile/app.config.ts` (env toggle)
- `apps/mobile/src/messaging/xmppTransport.ts`
- `apps/mobile/src/store/connection.ts` (simple connection state store)
- Minor edits where the transport is instantiated

**ACCEPTANCE:**

- With `USE_XMPP=true`, two simulator users (logged in via Firebase) can chat via ejabberd; messages appear in real time.
- Restart app → recent history loads via MAM.
- Delivery receipts reflected in UI (at minimum: sent vs delivered/read mapping).
- With `USE_XMPP=false`, Firebase transport still works as before.

**SELF-CHECKS:**

- No Firestore message writes when `USE_XMPP=true` (metadata updates are OK).
- Idempotent message IDs (UUID) preserved across transports.
- Graceful handling of disconnect/reconnect (no duplicate messages, no crashes).

---

## Cursor Prompt — **Phase 13 — Push Bridge + Firestore Sync** **(🟧 LAST PHASE BEYOND)**

**ROLE:** You are a backend engineer creating a **bridge service** that receives ejabberd webhooks and triggers **FCM push** + **Firestore metadata updates** (lastMessage, updatedAt, unread counts). This makes the hybrid architecture production-ready.

**GOAL:** When ejabberd gets a new message:

- If recipient is offline, send an FCM push.
- Update Firestore `chats/{chatId}` with `lastMessage`, `updatedAt` for fast chat list.
- (Optional) write minimal counters or delivery state mirrors.

**DO:**

1. Create a small Node service in `services/xmpp-bridge/`:

   - Use `express`, `firebase-admin`.
   - Endpoint `POST /ejabberd/webhook` that:

     - Validates `X-Webhook-Token` header matches env `WEBHOOK_TOKEN`.
     - Parses webhook JSON (sender JID, recipient JID, stanza body, message ID, timestamp).
     - Derives `senderUid` and `recipientUid` from `jid localpart`.
     - Builds `chatId = sort(senderUid, recipientUid).join('_')`.
     - Updates Firestore: `chats/{chatId}.lastMessage = { id, text, senderId, createdAt }`, `updatedAt = serverTimestamp()`.
     - Checks recipient presence (optional: read `/status/{uid}` mirror) to decide push.
     - Sends FCM to recipient’s device tokens (store tokens under `users/{uid}/tokens/{token}`) with minimal payload `{ chatId, senderName, preview }`.

2. Add `services/xmpp-bridge/.env.example`:

   ```
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
   FIREBASE_PROJECT_ID=your-project-id
   WEBHOOK_TOKEN=dev-secret
   PORT=8787
   ```

3. Update `infra/xmpp/ejabberd.yml` (already configured in Phase 11) to point `mod_webhooks` to `http://host.docker.internal:8787/ejabberd/webhook` for Docker Desktop, or keep `localhost` if running outside Docker. Ensure the header `X-Webhook-Token` is set.
4. Register device tokens:

   - In the app, on login, collect FCM token (Expo Notifications) and write to `users/{uid}/tokens/{token}`.

5. Foreground vs background:

   - For MVP bridge: always send push unless app is **foreground & in that chat** (optional optimization using a “foreground flag” you can mirror into Firestore).

6. Add a tiny `scripts/send-test-message.sh` (optional) to post a sample webhook payload to the bridge for local testing.

**FILES TO ADD/EDIT:**

- `services/xmpp-bridge/package.json`, `index.ts`
- `services/xmpp-bridge/.env.example`
- `services/xmpp-bridge/README.md` (how to run locally)
- App changes: token registration on login (one small util)
- `infra/xmpp/ejabberd.yml` (confirm `mod_webhooks` target)

**ACCEPTANCE:**

- Sending a message via app (USE_XMPP=true) triggers the webhook → Firestore `chats/{chatId}` updates `lastMessage/updatedAt`.
- If recipient app is not active, an **FCM push** arrives on their device/emulator and opens the correct chat on tap.
- Repeated webhook deliveries do **not** create duplicate updates (idempotent by message `id`).

**SELF-CHECKS:**

- Webhook endpoint rejects requests with wrong token.
- Bridge retries transient Firestore/FCM failures with backoff.
- Minimal payloads—no sensitive E2EE content in notifications.

---

that’s it — with these three focused phases, you’ll land a robust hybrid setup:

- **Phase 11:** infra up and verified
- **Phase 12:** client talks XMPP (toggle-able)
- **Phase 13:** pushes + Firestore chat list sync

want me to bundle **starter files** (skeletal `docker-compose.yml`, `ejabberd.yml`, and `xmppTransport.ts` scaffolding) so Cursor has concrete targets to fill in?
