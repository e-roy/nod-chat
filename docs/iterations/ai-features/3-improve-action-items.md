# Improve Action Items UX

## Changes Overview

Implement auto-extracting action items with smart staleness detection, loading indicators, expanded context window (300 messages), and improved date handling to match the summary feature improvements.

## Implementation Steps

### 1. Backend Changes (Firebase Functions)

**File: `functions/src/ai/analysis.ts`**

- Change message limit from 100 to 300 for action items (line 155)
- Add `messageCountAtActionItems` to cache update
- Return `messageCount` in response for staleness detection

**File: `functions/src/ai/genkit.ts`**

- Add current date/time context to action items prompt
- Update prompt to resolve relative dates (e.g., "by tomorrow" → "by March 16")
- Improve prompt to be more comprehensive

### 2. Type Updates

**File: `packages/shared/src/types.ts`**

- Update `ChatAI` interface to include `messageCountAtActionItems: number`
- This tracks how many messages existed when action items were extracted

### 3. Frontend Store Changes

**File: `apps/mobile/src/store/ai.ts`**

- Update `extractActionItems()` to handle `messageCount` response
- Add `checkActionItemsStaleness()` method that compares current message count vs cached
- Add `autoExtractActionItems()` method that checks staleness and extracts if needed
- Store `messageCountAtActionItems` in local state

### 4. Component Changes

**File: `apps/mobile/src/components/AIActionSheet.tsx`**

**On Sheet Open / Tab Switch (useEffect)**:

- When `isOpen` becomes true and `activeTab === 'actions'`:
- Check if action items exist
- If no action items: call `autoExtractActionItems()` immediately
- If action items exist: check staleness by comparing message counts
- If stale (new messages): show old items + "Updating..." indicator, extract in background

**Loading State Display**:

- Show "Extracting action items..." when no items exist and loading
- Show existing items with overlay banner "Updating action items..." when refreshing stale items
- Use semi-transparent banner at top (same as summary)

**Action Items Display**:

- Add metadata line: "X action items from Y messages • Updated Z ago"
- Remove refresh button (auto-refresh handles it)
- Keep existing item display (text, assignee, status)

**Remove Manual Extraction**:

- Remove "Extract Action Items" button from empty state
- Remove refresh icon from header
- Auto-extraction replaces manual triggers

### 5. Consistency with Summary Feature

Ensure action items follow the same UX patterns as summaries:

- Auto-extraction on tab open/switch
- Staleness detection and auto-refresh
- Loading states with old data visible
- Metadata display
- No manual refresh buttons
- 300 message context window

## Key UX Improvements

1. **Auto-extraction**: Action items extract automatically when opening the tab
2. **Loading states**: Clear "Extracting..." or "Updating..." indicators
3. **Staleness detection**: Compares current message count vs extraction message count
4. **Auto-refresh**: New messages trigger background refresh while showing old items
5. **Expanded context**: 300 messages instead of 100 (consistent with summary)
6. **Date resolution**: Resolves relative dates in action items using message timestamps
7. **Transparency**: Shows item count, message count, and last updated time
8. **Consistency**: Matches summary tab UX patterns

## Files to Modify

- `packages/shared/src/types.ts` (add messageCountAtActionItems)
- `functions/src/ai/analysis.ts` (increase limit to 300, return messageCount)
- `functions/src/ai/genkit.ts` (add date context, improve prompt)
- `apps/mobile/src/store/ai.ts` (staleness logic + auto-extraction)
- `apps/mobile/src/components/AIActionSheet.tsx` (auto-trigger + loading UI + remove manual buttons)
