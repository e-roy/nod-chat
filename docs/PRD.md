# 🧭 Product Requirements Document (PRD)

**Project:** MessageAI (Messaging App MVP)
**Tech Stack (Phase 1):** Expo (React Native) + Firebase (Auth, Firestore, FCM)
**Future Pivot:** Add ejabberd (XMPP Server) for scalable messaging core
**Deadline:** 24 hours for functional MVP

---

## 1. 🎯 Objective

Deliver a working **cross-platform mobile messaging app** that demonstrates real-time one-on-one and group chat using Firebase.
The MVP must run on local emulator / Expo Go and include core chat features, message persistence, and basic reliability UX (optimistic UI, presence, receipts).

---

## 2. 📱 User Stories

| #   | As a user I want to…                                           | So that I can …                             |
| --- | -------------------------------------------------------------- | ------------------------------------------- |
| 1   | Sign up / log in                                               | have a personal account and secure identity |
| 2   | View contacts / recent chats                                   | quickly start or resume conversations       |
| 3   | Send and receive messages instantly                            | communicate in real time                    |
| 4   | See message delivery state (sending → sent → delivered → read) | know the status of each message             |
| 5   | See when others are online or typing                           | sense activity and presence                 |
| 6   | Share images                                                   | exchange basic media                        |
| 7   | Participate in group chats (3+)                                | coordinate with multiple people             |
| 8   | Receive push notifications                                     | stay informed while app is foregrounded     |
| 9   | Retain message history offline                                 | review past messages without network        |

---

## 3. ⚙️ Core Functional Requirements

### 3.1 Authentication

- **Firebase Auth** using Email/Password (for MVP; phone auth later).
- Profile: `uid`, `displayName`, `photoURL`, `onlineStatus`.
- Create Firestore `users/{uid}` doc on signup.

### 3.2 One-on-One Chat

- Collection: `chats/{chatId}/messages/{messageId}`.
- `chatId` = sorted uid pair (e.g., `uidA_uidB`).
- Message schema:

  ```json
  {
    "id": "uuid",
    "senderId": "uid",
    "text": "string",
    "imageUrl": "string | null",
    "createdAt": "serverTimestamp()",
    "status": "sending|sent|delivered|read"
  }
  ```

- **Optimistic UI:** append message locally as “sending”, update on write success.
- **Realtime:** Firestore snapshot listeners for incoming messages.
- **Persistence:** Firestore offline cache + AsyncStorage backup (for history survival).

### 3.3 Presence & Typing

- **Online/Offline:** update `users/{uid}.online` via Cloud Function `onDisconnect()` in RTDB or Firestore mirror.
- **Typing:** ephemeral `typing/{chatId}/{uid}` boolean updated on key events; subscribed in chat screen.

### 3.4 Read Receipts & Delivery Status

- When recipient opens chat, mark `status = read` for their incoming messages.
- Cloud Function or client writes update sender’s view via Firestore listener.
- Local states:
  - _sending_ — optimistic message queued.
  - _sent_ — write confirmed to Firestore.
  - _delivered_ — recipient synced message.
  - _read_ — recipient opened chat.

### 3.5 Group Chat (3+ Users)

- `groups/{groupId}` document with metadata (name, photo, members [uids]).
- Subcollection `groups/{groupId}/messages`.
- Delivery states per member (optional for MVP → use “readBy [uid]” array).
- Optimistic UI identical to 1:1 chat.

### 3.6 Media Messaging

- Image picker → upload to Firebase Storage (`chatMedia/{chatId}/{uuid}.jpg`).
- Message stores `imageUrl`.
- Display image thumbnail in chat bubble.

### 3.7 Push Notifications (MVP Foreground)

- Use Expo Notifications + FCM.
- When new message received in active chat: local notification (visible only foreground).
- (Background push later via server key & Expo Push Service.)

---

## 4. 🧩 Non-Functional Requirements

| Area            | Requirement                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Performance     | Instant message delivery (< 300 ms latency on Wi-Fi). Optimistic UI always updates immediately. |
| Offline support | Messages and chats persist via Firestore offline mode and local cache.                          |
| Reliability     | App handles network loss — queued messages resend on reconnect.                                 |
| Scalability     | MVP scales to hundreds of users; future migration to ejabberd for millions.                     |
| Security        | Firebase Auth rules enforce user access to own data only; Firestore rules verified.             |
| UX              | UI responsive at 60 fps on modern devices; consistent delivery state icons.                     |
| Deployment      | Running on Expo Go / local simulator; backend deployed to Firebase (project ID placeholder).    |

---

## 5. 🧱 Data Model (Simplified)

```
users/
  {uid}: {
    displayName, photoURL, online, lastSeen
  }

chats/
  {chatId}: {
    participants: [uid1, uid2],
    lastMessage, updatedAt
  }
  messages/
    {messageId}: {
      senderId, text, imageUrl, createdAt, status
    }

groups/
  {groupId}: {
    name, photoURL, members[]
  }
  messages/
    {messageId}: {
      senderId, text, imageUrl, createdAt, readBy[]
    }

typing/
  {chatId}/
    {uid}: { isTyping: true }
```

---

## 6. 🧠 Migration Path → ejabberd

- Replace Firebase message transport with XMPP (WebSocket).
- Keep Firestore for Auth + profile + chat metadata.
- ejabberd handles message delivery, MAM (history), presence, groups.
- Push bridge sends FCM notifications via server hook.
- Client Messaging API (`MessagingTransport`) remains same; swap adapter.

---

## 7. 🚀 MVP Acceptance Criteria (24 Hour)

| Feature             | Pass Criteria                                            |
| ------------------- | -------------------------------------------------------- |
| Auth                | User can sign up and log in successfully.                |
| 1:1 Chat            | Two users exchange messages in real time.                |
| Persistence         | Messages persist after app restart / offline return.     |
| Optimistic UI       | Messages appear instantly on send.                       |
| Presence            | Online status visible on chat list.                      |
| Timestamp           | Each message shows formatted time.                       |
| Group Chat          | Three users can chat in same room.                       |
| Read Receipts       | Checkmark or status icon updates to read.                |
| Push ( foreground ) | Incoming message triggers notification banner.           |
| Deployment          | Runs on simulator / Expo Go; Firebase project connected. |

---

## 8. 🧰 Tech Stack Summary

| Layer             | Tool / Service                                        |
| ----------------- | ----------------------------------------------------- |
| Frontend          | Expo (React Native, TypeScript)                       |
| Backend           | Firebase Auth + Firestore + Storage + Cloud Functions |
| Notifications     | Expo Notifications + FCM                              |
| State Mgmt        | Zustand / Recoil / Context API                        |
| Image Upload      | Expo ImagePicker + Firebase Storage                   |
| Local Persistence | AsyncStorage / SQLite for cached history              |
| Future Transport  | ejabberd (XMPP over WebSocket)                        |

---

## 9. 📦 Deliverables (First Iteration)

- ✅ Expo project with Auth, Chat List, Chat Screen UI.
- ✅ Firestore schema & rules files.
- ✅ Basic image upload pipeline.
- ✅ Foreground notifications working.
- ✅ Deployed Firebase backend (Functions + DB).
- ✅ Documentation (README setup + env vars).
