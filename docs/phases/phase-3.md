**Phase 3 — Presence & Read Receipts**

**ROLE:** Expo + Firebase engineer.
**GOAL:** Show online/offline presence, typing, and read receipts.

**DO:**

1. Presence:

- Use Realtime Database for presence and mirror to Firestore:

  - RTDB path `/status/{uid} = { state:'online'|'offline', lastChanged:timestamp }`.
  - On connect/disconnect, update appropriately.
  - Cloud Function mirrors to `users/{uid}.online` and `lastSeen`.

- Chat List and headers subscribe to `users` docs to show presence.
- Presence dot = gluestack **Badge** variant.

2. Typing indicators:

- Collection `typing/{chatId}/{uid}` boolean.
- Debounce keystrokes; set true on input, set false after idle (e.g., 2s) or unmount.
- Typing indicator = gluestack **Spinner** + subtle text in chat header.

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
