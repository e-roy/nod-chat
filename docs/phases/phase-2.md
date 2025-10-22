**Phase 2 — One-on-One Messaging**

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

- Use gluestack **Textarea/Input**, **Button**, **HStack/VStack**, **Avatar**, **Badge** to build Composer, bubbles, and chat list tiles.
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
