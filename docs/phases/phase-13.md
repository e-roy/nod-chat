**Phase 13 — Push Bridge + Firestore Sync** **(🟧 LAST PHASE BEYOND)**

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
