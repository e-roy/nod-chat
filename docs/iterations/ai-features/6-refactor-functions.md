# Enhance AI Trigger Context

## Overview

Improve AI detection accuracy by providing conversation context (5 previous messages) and enriched message data (sender name, timestamp, text) to priority and calendar extraction functions.

## Changes Required

### 1. Update AI Detection Function Signatures

**functions/src/ai/detection/priority.ts**

- Change `detectPriority(messageText: string)` to accept:
  - `contextMessages`: Array of previous messages with `{ senderName, text, createdAt }`
  - `currentMessage`: The triggered message with `{ senderName, text, createdAt }`
- Update prompt to include conversation context
- Format context messages chronologically before the current message

**functions/src/ai/detection/calendar.ts**

- Change `extractCalendarEvents(messageText, messageId, participantUserIds, chatId)` to accept:
  - `contextMessages`: Array of previous messages with `{ senderName, text, createdAt }`
  - `currentMessage`: The triggered message with `{ senderName, text, createdAt }`
  - Keep existing `messageId`, `participantUserIds`, `chatId` parameters
- Update prompt to include conversation context
- Format context messages chronologically before the current message

### 2. Create Helper Function in messaging.ts

Add `fetchContextMessages()` helper:

```typescript
async function fetchContextMessages(
  collectionPath: string,
  currentMessageTimestamp: number,
  limit: number = 5
): Promise<Array<{ senderName: string; text: string; createdAt: number }>>;
```

This function will:

- Query the last 5 messages before the current message (by `createdAt`)
- Fetch sender names from the `users` collection
- Return enriched message data with sender names

### 3. Update `handlePriorityDetection()` in messaging.ts

Modify to:

- Call `fetchContextMessages()` to get 5 previous messages
- Fetch current message sender name
- Build enriched current message object
- Pass context and current message to `detectPriority()`

### 4. Update `handleCalendarExtraction()` in messaging.ts

Modify to:

- Call `fetchContextMessages()` to get 5 previous messages
- Fetch current message sender name
- Build enriched current message object
- Pass context and current message to `extractCalendarEvents()`

### 5. Update AI Prompts

**Priority detection prompt:**

- Add "Previous conversation context" section showing the 5 messages
- Add "Current message" section showing the triggered message
- Include timestamps for temporal context
- Instruct AI to consider conversation flow

**Calendar extraction prompt:**

- Add "Previous conversation context" section showing the 5 messages
- Add "Current message" section showing the triggered message
- Include timestamps to help resolve relative dates ("tomorrow", "next week")
- Instruct AI to use context for better event extraction

### 6. Add Date Formatting

Import `formatMessageDate` from `../utils` in both detection files to format timestamps in prompts.

## Implementation Details

### Message Context Structure

```typescript
interface MessageContext {
  senderName: string;
  text: string;
  createdAt: number; // Unix timestamp
}
```

### Query for Previous Messages

```typescript
const messagesQuery = await db
  .collection(collectionPath)
  .where("createdAt", "<", currentMessageTimestamp)
  .orderBy("createdAt", "desc")
  .limit(5)
  .get();
```

### Prompt Format Example

```
Previous conversation context:
[Mar 15, 2:30 PM] Alice: Can we schedule a meeting?
[Mar 15, 2:31 PM] Bob: Sure, how about tomorrow?
[Mar 15, 2:32 PM] Alice: That works for me
[Mar 15, 2:33 PM] Bob: What time?
[Mar 15, 2:34 PM] Alice: 3pm would be great

Current message:
[Mar 15, 2:35 PM] Bob: Let's meet tomorrow at 3pm then
```

## Benefits

- Better AI accuracy with conversation context
- Improved understanding of references ("that", "it", "this")
- Better resolution of relative time references
- More accurate priority detection based on urgency buildup
- More complete calendar event extraction

## Files to Modify

- `functions/src/ai/detection/priority.ts` - Update function signature and prompt
- `functions/src/ai/detection/calendar.ts` - Update function signature and prompt
- `functions/src/messaging.ts` - Add context fetching and update AI calls
