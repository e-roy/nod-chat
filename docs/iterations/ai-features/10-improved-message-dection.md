# AI Agent Orchestrator Implementation

## Overview

Refactor the message handling architecture to use a centralized AI Agent Orchestrator that makes intelligent routing decisions, shares context across actions, and provides fallback logic when AI is unavailable.

## Architecture Changes

### 1. Create Orchestrator Core (`functions/src/ai/orchestrator/`)

**`agent.ts`** - Main AI agent that analyzes messages and determines actions

- Uses Gemini 2.5 Flash Lite for routing decisions
- Returns structured action plan: `{ actions: string[], priority?: string, metadata?: object }`
- Handles errors gracefully

**`context.ts`** - Shared context fetching and preparation

- Single function to fetch message history (dynamic depth based on agent needs)
- Fetches participant info, sender data, chat metadata
- Returns enriched context object used by all actions
- Caches context to avoid redundant queries

**`executor.ts`** - Action execution coordinator

- Executes selected actions in parallel
- Passes shared context to all actions
- Collects results and handles errors per action
- Logs execution metrics

**`fallback.ts`** - Rule-based fallback when AI unavailable

- Keyword detection for priority ("urgent", "ASAP", "blocker", etc.)
- Date/time pattern matching for calendar events
- Simple heuristics to determine which actions to run
- Returns same action plan structure as AI agent

**`types.ts`** - Shared types for orchestrator

- `MessageContext` - enriched context object
- `ActionPlan` - agent decision output
- `ActionResult` - execution result interface
- `ActionHandler` - function signature for actions

### 2. Refactor Actions (`functions/src/ai/actions/`)

Move detection logic into action handlers with consistent interface:

**`priority.ts`** - Priority detection action

- Accepts enriched context + current message
- Runs existing `detectPriority` with pre-fetched context
- Updates `chatPriorities` and `userPriorities` collections
- Returns structured result

**`calendar.ts`** - Calendar extraction action

- Accepts enriched context + current message
- Runs existing `extractCalendarEvents` with pre-fetched context
- Updates `chatCalendar` and `userCalendar` collections
- Returns structured result

**`index.ts`** - Action registry

- Exports map of action name → handler function
- Easy to add new actions by registering here
- Type-safe action lookup

### 3. Update Main Messaging Handler (`functions/src/messaging.ts`)

Refactor `onChatMessageCreated` and `onGroupMessageCreated`:

1. Keep notification logic in critical path (no changes)
2. Replace parallel AI operations with orchestrator call
3. Remove `fetchMessageContext`, `handlePriorityDetection`, `handleCalendarExtraction` (moved to orchestrator)
4. Add orchestrator import and single invocation point

**Key changes:**

```typescript
// OLD (lines 166-176):
const aiOperations = Promise.all([
  handlePriorityDetection(...),
  handleCalendarExtraction(...)
]);

// NEW:
import { processMessageWithOrchestrator } from './ai/orchestrator';
await processMessageWithOrchestrator({
  messageData, messageId, chatId, collectionType: 'chats'
});
```

### 4. File Organization

```
functions/src/
  ai/
    orchestrator/
      agent.ts         (~100 LOC - AI routing decision)
      context.ts       (~150 LOC - context fetching)
      executor.ts      (~120 LOC - action execution)
      fallback.ts      (~80 LOC - rule-based fallback)
      types.ts         (~50 LOC - shared types)
      index.ts         (~30 LOC - main entry point)
    actions/
      priority.ts      (~100 LOC - priority action handler)
      calendar.ts      (~120 LOC - calendar action handler)
      index.ts         (~20 LOC - action registry)
    detection/
      [DEPRECATED - keep for reference, will be removed later]
  messaging.ts         (~450 LOC - simplified, -150 lines)
```

## Implementation Steps

### Phase 1: Create Orchestrator Infrastructure

1. Create `functions/src/ai/orchestrator/` folder and type definitions
2. Implement `context.ts` - extract and enhance `fetchMessageContext` logic
3. Implement `fallback.ts` - rule-based routing logic
4. Implement `agent.ts` - Gemini-powered routing decision maker
5. Create orchestrator `types.ts` with shared interfaces

### Phase 2: Build Action System

1. Create `functions/src/ai/actions/` folder
2. Refactor priority detection into action handler
3. Refactor calendar extraction into action handler
4. Create action registry in `actions/index.ts`
5. Implement `executor.ts` to run actions in parallel with shared context

### Phase 3: Integrate with Messaging Handler

1. Create main orchestrator entry point (`orchestrator/index.ts`)
2. Update `messaging.ts` to use orchestrator
3. Remove deprecated helper functions from `messaging.ts`
4. Test with AI available and unavailable scenarios

### Phase 4: Validation & Cleanup

1. Verify notifications still work (critical path unchanged)
2. Test AI routing decisions with various message types
3. Verify fallback logic when AI unavailable
4. Add logging for orchestrator decisions
5. Mark old detection folder for future removal (keep for reference)

## Benefits

- **50% fewer database queries** - single context fetch
- **Intelligent routing** - only run relevant actions
- **Easier to extend** - add new actions by registering in one place
- **Better error handling** - isolated action failures
- **Graceful degradation** - rule-based fallback when AI unavailable
- **Better organized code** - clear separation of concerns, files under 350 LOC

## Files to Modify

- `functions/src/messaging.ts` (refactor, simplify)

## Files to Create

- `functions/src/ai/orchestrator/types.ts`
- `functions/src/ai/orchestrator/context.ts`
- `functions/src/ai/orchestrator/agent.ts`
- `functions/src/ai/orchestrator/fallback.ts`
- `functions/src/ai/orchestrator/executor.ts`
- `functions/src/ai/orchestrator/index.ts`
- `functions/src/ai/actions/priority.ts`
- `functions/src/ai/actions/calendar.ts`
- `functions/src/ai/actions/index.ts`

## Testing Approach

1. Deploy and test with real Firebase environment
2. Verify FCM notifications still work
3. Test orchestrator with various message types
4. Verify fallback when `GOOGLE_API_KEY` not set
5. Check Firestore updates for priorities and calendar events
