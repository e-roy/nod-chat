**Phase 4 — Group Chat**

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
- Group header chips with **AvatarGroup** (compose Avatars in HStack).
- Message attribution using **Text** variants and small **Caption** style.

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
