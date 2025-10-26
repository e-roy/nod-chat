# AI Features Implementation for Remote Team Professionals

## Overview

Implement 5 AI features using Firebase Functions (genkit + @genkit-ai/googleai) with Firestore caching, real-time triggers for priorities/calendar, and user-initiated search. Add UI in `ChatScreen.tsx` and `GroupChatScreen.tsx` with action sheets.

## Data Models (Firestore Collections)

### 1. `chatAI/{chatId}` - Per-chat AI analysis

```typescript
{
  chatId: string;
  summary: string | null;
  actionItems: Array<{
    id: string;
    text: string;
    assignee?: string;
    status: "pending" | "done";
  }>;
  decisions: Array<{
    id: string;
    subject: string;
    decision: string;
    timestamp: number;
  }>;
  lastUpdated: number;
  messageCount: number; // trigger refresh when threshold crossed
}
```

### 2. `chatPriorities/{chatId}` - Per-chat priority flags

```typescript
{
  chatId: string;
  priorities: Array<{
    messageId: string;
    level: "high" | "urgent";
    reason: string;
    timestamp: number;
  }>;
  lastUpdated: number;
}
```

### 3. `chatCalendar/{chatId}` - Per-chat calendar events

```typescript
{
  chatId: string;
  events: Array<{
    id: string;
    title: string;
    date: number;
    time?: string;
    participants?: string[];
    extractedFrom: string; // messageId
  }>;
  lastUpdated: number;
}
```

### 4. `userCalendar/{userId}` - Aggregated user calendar

```typescript
{
  userId: string;
  events: Array<{
    id: string;
    chatId: string;
    title: string;
    date: number;
    time?: string;
    participants?: string[];
    extractedFrom: string;
  }>;
  lastUpdated: number;
}
```

### 5. `userPriorities/{userId}` - Aggregated user priorities

```typescript
{
  userId: string;
  priorities: Array<{
    chatId: string;
    messageId: string;
    level: "high" | "urgent";
    reason: string;
    timestamp: number;
  }>;
  lastUpdated: number;
}
```

## Firebase Functions

### Setup Functions (`functions/src/ai/genkit.ts`)

- Initialize genkit with googleAI plugin
- Export shared AI client configuration
- Helper functions for prompt engineering

### Callable Functions

#### 1. `generateChatSummary` (callable)

- **Input**: `{ chatId: string, forceRefresh?: boolean }`
- **Logic**:
  - Check `chatAI/{chatId}` cache
  - If cached and `!forceRefresh`, return cached
  - Fetch last 100 messages from `messages` collection
  - Use Genkit to generate summary
  - Update `chatAI/{chatId}.summary`
- **Output**: `{ summary: string }`

#### 2. `extractActionItems` (callable)

- **Input**: `{ chatId: string, forceRefresh?: boolean }`
- **Logic**: Similar to summary, extract action items with assignees
- **Output**: `{ actionItems: ActionItem[] }`

#### 3. `extractDecisions` (callable)

- **Input**: `{ chatId: string, subject?: string }`
- **Logic**: Extract decisions grouped by subject/topic
- **Output**: `{ decisions: Decision[] }`

#### 4. `searchChatMessages` (callable)

- **Input**: `{ chatId: string, query: string }`
- **Logic**:
  - Fetch all messages from chat
  - Use Genkit semantic search/embedding
  - Return ranked results
- **Output**: `{ results: Array<{ messageId: string, relevance: number, snippet: string }> }`

#### 5. `detectPriority` (onDocumentCreated: `messages/{messageId}`)

- **Trigger**: Real-time on message creation
- **Logic**:
  - Analyze message text with Genkit
  - Detect urgency keywords, deadlines, blockers
  - Update `chatPriorities/{chatId}`
  - Update `userPriorities/{userId}` for all chat participants

#### 6. `extractCalendarEvents` (onDocumentCreated: `messages/{messageId}`)

- **Trigger**: Real-time on message creation
- **Logic**:
  - Extract dates/times/meeting info with Genkit
  - Update `chatCalendar/{chatId}`
  - Update `userCalendar/{userId}` for all chat participants

## Mobile App Changes

### Shared Types (`packages/shared/src/types.ts`)

Add AI-related types matching Firestore models above.

### Store (`apps/mobile/src/store/ai.ts`)

New Zustand store:

- `chatAISummaries: Map<chatId, ChatAI>`
- `chatPriorities: Map<chatId, ChatPriorities>`
- `chatCalendar: Map<chatId, ChatCalendar>`
- `loadChatAI(chatId)` - fetch from Firestore
- `loadPriorities(chatId)` - fetch from Firestore
- `loadCalendar(chatId)` - fetch from Firestore
- `searchMessages(chatId, query)` - call Firebase callable
- Real-time listeners for priority/calendar updates

### UI Components

#### 1. `AIActionSheet.tsx`

- Tabs: Search, Summarization, Action Items, Decision Tracking
- Search tab: Input field + results list
- Other tabs: Display cached data with refresh button
- Loading/error states

#### 2. `PriorityActionSheet.tsx`

- Display priority messages for current chat
- Show priority level, reason, timestamp
- Link to jump to original message

#### 3. `CalendarActionSheet.tsx`

- Display calendar events for current chat
- Show date/time, title, participants
- Link to jump to source message

#### 4. Chat Screen Header Buttons

Update `ChatScreen.tsx` and `GroupChatScreen.tsx`:

- Add header buttons: `[AI] [Priority?] [Calendar]`
- Priority button only visible if priorities exist
- Each opens respective action sheet

### Callable Function Wrappers (`apps/mobile/src/firebase/aiCallables.ts`)

- `generateChatSummary(chatId)`
- `extractActionItems(chatId)`
- `extractDecisions(chatId, subject?)`
- `searchChatMessages(chatId, query)`

## Implementation Steps

1. **Setup Genkit in Firebase Functions**
   - Add `genkit` and `@genkit-ai/googleai` to `functions/package.json`
   - Create `functions/src/ai/genkit.ts` with initialization
   - Set `GOOGLE_API_KEY` in Firebase config

2. **Create Data Models & Types**
   - Add types to `packages/shared/src/types.ts`
   - Update shared package exports

3. **Implement Firebase Functions**
   - Callable functions: summary, action items, decisions, search
   - Triggered functions: priority detection, calendar extraction
   - Create `functions/src/ai/analysis.ts` for AI logic

4. **Create Mobile Store**
   - `apps/mobile/src/store/ai.ts` with Zustand
   - Real-time Firestore listeners
   - Callable function wrappers

5. **Build UI Components**
   - `AIActionSheet.tsx` with tabs
   - `PriorityActionSheet.tsx`
   - `CalendarActionSheet.tsx`

6. **Update Chat Screens**
   - Add header buttons to `ChatScreen.tsx`
   - Add header buttons to `GroupChatScreen.tsx`
   - Wire action sheet state management

7. **Testing & Polish**
   - Test all AI features with real conversations
   - Handle loading/error states
   - Optimize caching strategy
   - Add refresh triggers based on message count

## Key Files

- `functions/src/ai/genkit.ts` - Genkit setup
- `functions/src/ai/analysis.ts` - AI callable functions
- `functions/src/ai/triggers.ts` - Real-time priority/calendar
- `packages/shared/src/types.ts` - Shared AI types
- `apps/mobile/src/store/ai.ts` - AI state management
- `apps/mobile/src/firebase/aiCallables.ts` - Function wrappers
- `apps/mobile/src/components/AIActionSheet.tsx` - Main AI UI
- `apps/mobile/src/components/PriorityActionSheet.tsx` - Priority UI
- `apps/mobile/src/components/CalendarActionSheet.tsx` - Calendar UI
- `apps/mobile/src/screens/ChatScreen.tsx` - Updated with buttons
- `apps/mobile/src/screens/GroupChatScreen.tsx` - Updated with buttons
