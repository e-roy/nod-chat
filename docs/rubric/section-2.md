## Section 2: Mobile App Quality (20 points)

### Mobile Lifecycle Handling (8 points)

**Excellent (7-8 points)**

- App backgrounding → WebSocket maintains or reconnects instantly
- Foregrounding → instant sync of missed messages
- Push notifications work when app is closed
- No messages lost during lifecycle transitions
- Battery efficient (no excessive background activity)

**Good (5-6 points)**

- Lifecycle mostly handled
- Reconnection takes 2-3 seconds
- Push notifications work
- Minor sync delays

**Satisfactory (3-4 points)**

- Basic lifecycle support
- Slow reconnection (5+ seconds)
- Push notifications unreliable
- Some message loss

**Poor (0-2 points)**

- Backgrounding breaks connection
- Manual restart required
- Push notifications don't work
- Frequent message loss

### Performance & UX (12 points)

**Excellent (11-12 points)**

- App launch to chat screen <2 seconds
- Smooth 60 FPS scrolling through 1000+ messages
- Optimistic UI updates (messages appear instantly before server confirm)
- Images load progressively with placeholders
- Keyboard handling perfect (no UI jank)
- Professional layout and transitions

**Good (9-10 points)**

- Launch under 3 seconds
- Smooth scrolling through 500+ messages
- Optimistic updates work
- Good keyboard handling
- Minor layout issues

**Satisfactory (6-8 points)**

- Launch 3-5 seconds
- Scrolling smooth for 200+ messages
- Some optimistic updates
- Keyboard causes minor issues
- Basic layout

**Poor (0-5 points)**

- Slow launch (5+ seconds)
- Laggy scrolling
- No optimistic updates
- Keyboard breaks UI
- Janky or missing components
