**Phase 5 — Media & Foreground Push** **(🟢 LAST PHASE OF MVP)**

**ROLE:** Expo + Firebase engineer.
**GOAL:** Image messaging + foreground notifications (Expo + FCM).

**DO:**

1. Media:

- Integrate `expo-image-picker`; upload to Firebase Storage under `chatMedia/{chatId}/{uuid}.jpg`.
- Add upload progress UI; message includes `imageUrl`.
- Thumbnails in chat bubbles; tap to open full.
- Image bubbles using gluestack **Image** inside **Card** with rounded corners.
- Use **Actionsheet/Sheet** for media picker options.

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
