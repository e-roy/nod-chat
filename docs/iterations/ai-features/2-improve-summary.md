# Improve AI Summary UX

## Changes Overview

Implement auto-generating summaries with smart staleness detection, loading indicators, and expanded context window (300 messages) with recency-weighted AI analysis.

## Implementation Steps

### 1. Backend Changes (Firebase Functions)

**File: `functions/src/ai/genkit.ts`**

- Update `generateSummary()` to accept message count parameter (default 300)
- Modify prompt to emphasize recent messages have more relevance
- Adjust summary length guidance from "2-3 sentences" to "1-2 paragraphs capturing key topics, with emphasis on recent discussions"

**File: `functions/src/ai/analysis.ts`**

- Change message limit from 100 to 300 (line 74)
- Add `messageCount` parameter to request interface
- Return `messageCount` in response for staleness detection

### 2. Frontend Store Changes

**File: `apps/mobile/src/store/ai.ts`**

- Add `summaryMessageCount` to track how many messages were used for last summary
- Modify `generateSummary()` to accept optional `messageCount` parameter (default 300)
- Add `checkSummaryStaleness()` method that compares current message count vs cached
- Add `autoGenerateSummary()` method that checks staleness and generates if needed

### 3. Component Changes

**File: `apps/mobile/src/components/AIActionSheet.tsx`**

**On Sheet Open (useEffect)**:

- When `isOpen` becomes true and `activeTab === 'summary'`:
- Check if summary exists
- If no summary: call `generateSummary()` immediately
- If summary exists: check staleness by comparing message counts
- If stale (new messages): show old summary + "Updating summary..." indicator, call `generateSummary(chatId, true)` in background

**Loading State Display**:

- Show "Generating summary..." when no summary exists and loading
- Show existing summary with overlay badge "Updating summary..." when refreshing stale summary
- Use semi-transparent banner at top of summary content area

**Summary Display**:

- Add metadata line: "Summary of [messageCount] messages • Updated [relative time]"
- Show staleness indicator if new messages detected

### 4. Auto-Refresh on Tab Switch

**File: `apps/mobile/src/components/AIActionSheet.tsx`**

- Add `useEffect` watching `activeTab`
- When switching to 'summary' tab, trigger staleness check
- Auto-refresh if stale (with loading indicator over old summary)

### 5. Type Updates

**File: `packages/shared/src/types.ts`**

- Update `ChatAI` interface to include `messageCountAtSummary: number`
- This tracks how many messages existed when summary was created

## Key UX Improvements

1. **Auto-generation**: Summary generates automatically when sheet opens (no manual button click needed)
2. **Loading states**: Clear "Generating..." or "Updating..." indicators
3. **Staleness detection**: Compares current message count vs summary's message count
4. **Auto-refresh**: New messages trigger background refresh while showing old summary
5. **Expanded context**: 300 messages instead of 100
6. **Better summaries**: Prompt adjusted for longer, more comprehensive summaries with recency bias
7. **Transparency**: Shows message count and last updated time

## Files to Modify

- `functions/src/ai/genkit.ts` (prompt + message handling)
- `functions/src/ai/analysis.ts` (message limit + response data)
- `apps/mobile/src/store/ai.ts` (staleness logic + auto-generation)
- `apps/mobile/src/components/AIActionSheet.tsx` (auto-trigger + loading UI)
- `packages/shared/src/types.ts` (type updates)
