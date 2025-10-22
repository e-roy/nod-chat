**Phase 8 — Background Push & Deep Links**

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
