**Phase 12 — XMPP Transport Integration (Hybrid Client)**

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
