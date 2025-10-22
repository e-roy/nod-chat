**Phase 10 — Security & Rules Hardening** **(🟦 LAST PHASE OF ALL FEATURES)**

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
