# Consolidate Firebase Triggers & Enhance Calendar System

## Phase 1: Consolidate Firebase Function Triggers

### Backend Changes

**1.1 Merge AI triggers into messaging triggers** (`functions/src/messaging.ts`)

- Import AI functions: `detectPriority`, `extractCalendarEvents`, `isAIAvailable`
- In `onChatMessageCreated`: Add parallel AI calls after notification logic
- In `onGroupMessageCreated`: Add parallel AI calls after notification logic
- Run priority detection and calendar extraction in `Promise.all()` for parallel execution
- Add proper error handling for AI operations (don't fail notification if AI fails)

**1.2 Delete obsolete trigger file** (`functions/src/ai/triggers.ts`)

- Remove file entirely
- Update `functions/src/index.ts` to remove exports for deleted triggers

**1.3 Enhance calendar extraction** (`functions/src/ai/genkit.ts`)

- Modify `extractCalendarEvents` to accept `participants: string[]` parameter
- Update AI prompt to include participant names/emails for context
- Ensure extracted events include all chat participants by default
- Add `chatId` to event structure at extraction time

## Phase 2: Improve Calendar Data Structure

### Backend Schema Changes

**2.1 Add indexed fields for searchability** (`functions/src/messaging.ts`)

- When saving to `chatCalendar/{chatId}`, add:
- `events` array with each event containing: `date` (timestamp), `chatId`, `participants`
- When saving to `userCalendar/{userId}`, ensure:
- Events include `date`, `chatId`, `participants` for filtering
- Use proper timestamp format for date range queries

**2.2 Update Firestore indexes** (`firestore.indexes.json`)

- Add composite index: `chatCalendar` collection on `chatId` + `events.date`
- Add composite index: `userCalendar` collection on `userId` + `events.date`
- Add composite index: `userCalendar` collection on `userId` + `events.chatId` + `events.date`

**2.3 Update TypeScript types** (`packages/shared/src/types.ts`)

- Ensure `CalendarEvent` includes `participants: string[]` (already exists)
- Ensure `ChatCalendar` and `UserCalendar` support date range filtering

## Phase 3: Frontend Calendar Store Enhancements

### Store Updates

**3.1 Add calendar query methods** (`apps/mobile/src/store/ai.ts`)

- Add `loadCalendarByDateRange(chatId, startDate, endDate)` method
- Add `loadAllUserCalendars(userId)` method to fetch across all chats
- Add `filterEventsByDateRange(events, startDate, endDate)` helper
- Add loading states: `calendarLoading: Map<string, boolean>`
- Add error states: `calendarErrors: Map<string, string>`

**3.2 Update existing methods**

- `loadCalendar`: Add try-catch with proper error state updates
- Add `clearCalendarError(chatId)` method

## Phase 4: UI Improvements

### CalendarActionSheet Component

**4.1 Add loading states** (`apps/mobile/src/components/CalendarActionSheet.tsx`)

- Show skeleton loader while `calendar` is undefined and loading
- Show spinner on refresh button during refresh
- Add loading state from store: `const isLoading = loading.get('calendar-${chatId}')`

**4.2 Add error handling**

- Display error message if calendar fails to load
- Add retry button on error state
- Show toast notification on extraction errors
- Handle empty state vs loading state vs error state distinctly

**4.3 Improve empty state**

- Add illustration or icon for empty state
- Provide helpful text: "Send messages with dates/times and they'll appear here"
- Add example: "Try: 'Let's meet tomorrow at 2pm'"

**4.4 Add date range filtering UI**

- Add filter buttons: "Upcoming", "Past", "All"
- Add date picker for custom range (optional)
- Filter events client-side initially, add server-side filtering later if needed

**4.5 Show participant info**

- Display participant avatars/names for each event
- Highlight current user in participant list
- Show participant count badge

## Phase 5: Testing & Validation

**5.1 Test trigger consolidation**

- Send test messages in chats and groups
- Verify notifications still work
- Verify priority detection still works
- Verify calendar extraction still works
- Check Firebase Function logs for errors
- Verify execution time and cost reduction

**5.2 Test calendar functionality**

- Send messages with various date formats
- Verify events appear in CalendarActionSheet
- Test refresh functionality
- Test error states (disconnect network, etc.)
- Verify participants are correctly extracted

**5.3 Test searchability**

- Query events by date range
- Query events across multiple chats
- Verify Firestore indexes are working

## Key Files to Modify

### Backend

- `functions/src/messaging.ts` - Consolidate triggers, add AI calls
- `functions/src/ai/genkit.ts` - Enhance calendar extraction with participants
- `functions/src/ai/triggers.ts` - DELETE this file
- `functions/src/index.ts` - Remove deleted trigger exports
- `firestore.indexes.json` - Add composite indexes

### Frontend

- `apps/mobile/src/store/ai.ts` - Add loading/error states, query methods
- `apps/mobile/src/components/CalendarActionSheet.tsx` - Add loading, errors, filters
- `packages/shared/src/types.ts` - Verify types support new structure

## Success Criteria

- ✅ Only 2 triggers fire per message (down from 6)
- ✅ Calendar events include all conversation participants
- ✅ Events are searchable by date range and chat thread
- ✅ UI shows loading states during data fetch
- ✅ UI shows helpful error messages with retry options
- ✅ Empty state provides guidance to users
- ✅ No regression in notifications or priority detection
