## Section 1: Core Messaging Infrastructure (35 points)

### Real-Time Message Delivery (12 points)

**Excellent (11-12 points)**

- Sub-200ms message delivery on good network
- Messages appear instantly for all online users
- Zero visible lag during rapid messaging (20+ messages)
- Typing indicators work smoothly
- Presence updates (online/offline) sync immediately

**Good (9-10 points)**

- Consistent delivery under 300ms
- Occasional minor delays with heavy load
- Typing indicators mostly responsive

**Satisfactory (6-8 points)**

- Messages deliver but noticeable delays (300-500ms)
- Some lag during rapid messaging
- Typing indicators work but laggy

**Poor (0-5 points)**

- Inconsistent delivery
- Frequent delays over 500ms
- Broken under concurrent messaging

### Offline Support & Persistence (12 points)

**Excellent (11-12 points)**

- User goes offline → messages queue locally → send when reconnected
- App force-quit → reopen → full chat history preserved
- Messages sent while offline appear for other users once online
- Network drop (30s+) → auto-reconnects with complete sync
- Clear UI indicators for connection status and pending messages
- Sub-1 second sync time after reconnection

**Good (9-10 points)**

- Offline queuing works for most scenarios
- Reconnection works but may lose last 1-2 messages
- Connection status shown
- Minor sync delays (2-3 seconds)

**Satisfactory (6-8 points)**

- Basic offline support but loses some messages
- Reconnection requires manual refresh
- Inconsistent persistence
- Slow sync (5+ seconds)

**Poor (0-5 points)**

- Messages lost when offline
- Reconnection fails frequently
- App restart loses recent messages
- No connection indicators

**Testing Scenarios:**

1. Send 5 messages while offline → go online → all messages deliver
2. Force quit app mid-conversation → reopen → chat history intact
3. Network drop for 30 seconds → messages queue and sync on reconnect
4. Receive messages while offline → see them immediately when online

### Group Chat Functionality (11 points)

**Excellent (10-11 points**)

- 3+ users can message simultaneously
- Clear message attribution (names/avatars)
- Read receipts show who's read each message
- Typing indicators work with multiple users
- Group member list with online status
- Smooth performance with active conversation

**Good (8-9 points)**

- Group chat works for 3-4 users
- Good message attribution
- Read receipts mostly work
- Minor issues under heavy use

**Satisfactory (5-7 points)**

- Basic group chat functionality
- Attribution works but unclear
- Read receipts unreliable
- Performance degrades with 4+ users

**Poor (0-4 points**)

- Group chat broken or unusable
- Messages get mixed up
- Can't tell who sent what
- Crashes with multiple users
