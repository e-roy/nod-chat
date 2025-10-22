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
