# Add User-wide Priorities and Calendar Screens

## Overview

Create two new screens accessible via bottom navigation that show all priorities and calendar events for the current user across all chats, reusing existing UI components to avoid code duplication.

## Implementation Steps

### 1. Extend AI Store with User-level Data Loading

**File:** `apps/mobile/src/store/ai.ts`

Add new state and actions to load user-level priorities and calendar:

- Add state: `userPriorities`, `userCalendar`, `userPriorityListener`, `userCalendarListener`
- Add actions: `loadUserPriorities(userId)`, `loadUserCalendar(userId)`
- Subscribe to `userPriorities/{userId}` and `userCalendar/{userId}` Firestore documents
- Store listeners for cleanup

### 2. Create Reusable List Components

**New Files:**

- `apps/mobile/src/components/PriorityList.tsx` - Extract list rendering logic from `PriorityActionSheet`
- `apps/mobile/src/components/CalendarList.tsx` - Extract list rendering logic from `CalendarActionSheet`

These components will:

- Accept priorities/events array as props
- Accept `onItemPress` callback with `chatId` and `messageId`
- Handle empty states, loading, errors
- Be reusable in both action sheets and full screens

### 3. Refactor Existing Action Sheets

**Files:** `apps/mobile/src/components/PriorityActionSheet.tsx`, `apps/mobile/src/components/CalendarActionSheet.tsx`

Refactor to use the new list components:

- Keep action sheet wrapper and header
- Replace list rendering with `<PriorityList />` or `<CalendarList />`
- Pass chat-specific data to list components

### 4. Create New Screen Components

**New Files:**

- `apps/mobile/src/screens/PrioritiesScreen.tsx` - Full screen for all user priorities
- `apps/mobile/src/screens/CalendarScreen.tsx` - Full screen for all user calendar events

These screens will:

- Load user-level data from AI store on mount
- Use `<PriorityList />` / `<CalendarList />` components
- Handle navigation to specific chat when item is tapped
- Include refresh functionality
- Show chat name/context for each item

### 5. Update Navigation

**File:** `apps/mobile/src/navigation/index.tsx`

Add two new tabs to `MainTabs`:

- "Priorities" tab with `AlertCircle` icon
- "Calendar" tab with `Calendar` icon
- Position them between "Groups" and "Settings"
- Update tab bar height if needed (currently 80)

### 6. Update Navigation Types

**File:** `apps/mobile/src/types/navigation.ts`

Add new screen types to `RootStackParamList`:

- `Priorities: undefined`
- `Calendar: undefined`

## Key Design Decisions

1. **Code Reuse:** Extract list rendering into separate components to avoid duplication between action sheets and full screens
2. **Navigation Flow:** When tapping a priority/calendar item from the full screen, navigate to the appropriate chat screen and scroll to the message
3. **Data Loading:** User-level data is loaded once when screens mount and kept in sync via Firestore listeners
4. **Chat Context:** Each item in user-level screens shows which chat it came from (using chat name or participant names)
5. **Consistent UI:** Reuse existing styles, colors, and patterns from action sheets for visual consistency
