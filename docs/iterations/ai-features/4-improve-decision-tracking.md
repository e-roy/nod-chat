# Improve Decisions UX

## Overview

Enhance the decisions feature to match the UX improvements made to summaries and action items: auto-extraction, staleness detection, loading states, 300-message context, and proper timestamp parsing from AI responses.

## Current State Analysis

**How it works now:**

- **Trigger**: Manual only - user clicks refresh icon or "Extract Decisions" button
- **Data**: Fetches last 100 messages → AI extracts decisions → caches in Firestore
- **Backend**: `functions/src/ai/analysis.ts` calls `extractDecisions()` in `genkit.ts`
- **AI Processing**: Uses Gemini 2.5 Flash Lite with `DecisionSchema` (subject, decision, timestamp)
- **Problem**: Timestamp from AI is ignored; backend uses `Date.now()` instead (line 278 in `genkit.ts`)

**Issues to fix:**

1. No auto-extraction when opening sheet/tab
2. No staleness detection (`messageCountAtDecisions` missing)
3. Only 100 messages (vs 300 for summaries/actions)
4. No loading state while refreshing
5. No metadata display
6. Manual refresh button (inconsistent UX)
7. AI timestamp ignored (uses extraction time instead of decision time)
8. No current date context for AI

## Implementation Plan

### 1. Backend Changes

**File: `packages/shared/src/types.ts`**

- Add `messageCountAtDecisions: number` to `ChatAI` interface (line ~75)
- This tracks message count when decisions were extracted

**File: `functions/src/ai/genkit.ts`** (lines 224-280)

Current issues:

- Line 236: No date formatting for messages (unlike summaries/actions)
- Line 255: No current date context in prompt
- Line 278: Hardcoded `timestamp: Date.now()` ignores AI's timestamp string

Changes needed:

- Import and use `formatMessageDate()` and `getCurrentDateContext()` from `dateUtils.ts`
- Update messages formatting: `[${formatMessageDate(m.createdAt)}] ${m.text}`
- Add current date context to prompt
- Parse AI's timestamp string to actual date (like we parse dueDates in action items)
- Update prompt to emphasize using actual dates from conversation

**File: `functions/src/ai/analysis.ts`** (lines 210-273)

Changes:

- Line 237: Change limit from 100 to 300 messages
- Line 262: Add `messageCount: messages.length` to cache
- Line 263: Add `messageCountAtDecisions: messages.length` to cache
- Line 267: Return `{ decisions, messageCount }` instead of just `{ decisions }`

### 2. Frontend Store Changes

**File: `apps/mobile/src/store/ai.ts`** (lines 270-323)

Add to `AIStore` interface:

- `checkDecisionsStaleness: (chatId: string) => Promise<boolean>`
- `autoExtractDecisions: (chatId: string) => Promise<void>`

Update `extractDecisions()`:

- Handle `messageCount` from backend response
- Store `messageCountAtDecisions` in state (line 301)

Add `checkDecisionsStaleness()`:

```typescript
// Similar to checkActionItemsStaleness
// Compare current message count vs messageCountAtDecisions
// Return true if new messages exist
```

Add `autoExtractDecisions()`:

```typescript
// Similar to autoExtractActionItems
// Check if decisions exist
// If not, extract immediately
// If yes, check staleness and refresh if needed
```

Update initial state object (line 289-298):

- Add `messageCountAtDecisions: 0` to the `existing` object

### 3. Component Changes

**File: `apps/mobile/src/components/AIActionSheet.tsx`** (lines 613-673)

**Add useEffect for auto-extraction** (after line 98):

```typescript
useEffect(() => {
  if (isOpen && activeTab === "decisions") {
    autoExtractDecisions(chatId).catch((err) => {
      console.error("Auto-extract decisions on tab switch failed:", err);
    });
  }
}, [activeTab, chatId, isOpen, autoExtractDecisions]);
```

**Update `renderDecisionsTab()`**:

Remove manual triggers:

- Remove refresh icon button (lines 619-626)
- Remove "Extract Decisions" button from empty state (lines 667-669)

Add metadata helpers:

```typescript
const hasDecisions = chatAI?.decisions && chatAI.decisions.length > 0;
const isLoading = isLoadingDecisions;
const decisionsCount = chatAI?.decisions?.length || 0;
const messageCount = chatAI?.messageCount || 0;
const lastUpdated = chatAI?.lastUpdated || 0;

// Helper to format relative time (reuse from summary/actions)
const formatRelativeTime = (timestamp: number) => { ... };
```

Update loading states:

- When `isLoading && !hasDecisions`: Show "Extracting decisions..." with spinner
- When `isLoading && hasDecisions`: Show overlay banner "Updating decisions..." + existing decisions
- When `hasDecisions`: Show metadata "X decisions from Y messages • Updated Z ago"

Update decision display:

- Keep existing subject, decision text, and timestamp display
- Format timestamp using relative or absolute date (consider improving format)

### 4. Type Updates for Backend Response

**File: `apps/mobile/src/store/ai.ts`** (line 278-281)

Update callable type:

```typescript
const callable = httpsCallable<
  { chatId: string; subject?: string },
  { decisions: Decision[]; messageCount: number } // Add messageCount
>(functions, "extractChatDecisions");
```

## Key Improvements

1. **Auto-extraction**: Decisions extract automatically when opening the decisions tab
2. **Staleness detection**: Tracks `messageCountAtDecisions` to detect new messages
3. **Auto-refresh**: New messages trigger background refresh while showing old decisions
4. **Expanded context**: 300 messages instead of 100 (consistent with summaries/actions)
5. **Proper timestamps**: Parse AI's timestamp to show when decision was actually made
6. **Date context**: AI receives current date and formatted message dates
7. **Loading states**: Clear "Extracting..." or "Updating..." indicators
8. **Metadata display**: Shows decision count, message count, and last updated time
9. **Consistency**: Matches summary and action items UX patterns

## Files to Modify

1. `packages/shared/src/types.ts` - Add `messageCountAtDecisions`
2. `functions/src/ai/genkit.ts` - Parse timestamp, add date context, use 300 messages
3. `functions/src/ai/analysis.ts` - Increase to 300 messages, return messageCount
4. `apps/mobile/src/store/ai.ts` - Add staleness detection and auto-extraction
5. `apps/mobile/src/components/AIActionSheet.tsx` - Auto-trigger, loading UI, remove manual buttons
