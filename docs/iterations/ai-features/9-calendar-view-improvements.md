# Calendar View Improvements

## Overview

Enhance the calendar UI with three view modes (Day, Week, List), swipe navigation, and persistent user preferences. Remove refresh buttons since real-time Firestore subscriptions keep data current automatically.

## Key Changes

### 1. Create View Mode Toggle Component

**File**: `apps/mobile/src/components/CalendarViewToggle.tsx` (new)

- Segmented control with three options: Day, Week, List
- Styled to match app theme (light/dark mode)
- Compact design suitable for header placement

### 2. Refactor CalendarList Component

**File**: `apps/mobile/src/components/CalendarList.tsx`

- Rename to `CalendarListView.tsx` for clarity
- Keep existing list functionality but optimize for "List" mode
- Remove date formatting logic (move to shared utils)

### 3. Create Day View Component

**File**: `apps/mobile/src/components/CalendarDayView.tsx` (new)

- Display events for a single selected day
- Horizontal date selector showing week at a glance (scrollable)
- Current day highlighted with accent color
- Swipeable between days using `react-native-gesture-handler`
- Arrow buttons for previous/next day navigation
- Empty state: "No events on this day"

### 4. Create Week View Component

**File**: `apps/mobile/src/components/CalendarWeekView.tsx` (new)

- Vertical scrolling list grouped by day
- Day headers with date and day name
- Events listed under each day header
- Swipeable between weeks using `react-native-gesture-handler`
- Arrow buttons for previous/next week navigation
- Show 7 days (Monday-Sunday or Sunday-Saturday based on locale)

### 5. Create Date Utilities

**File**: `apps/mobile/src/utils/dateUtils.ts` (new)

- `formatDate()` - consistent date formatting
- `getWeekDays()` - get array of dates for a week
- `isSameDay()` - compare if two dates are same day
- `getStartOfWeek()`, `getEndOfWeek()` - week boundaries
- `getDayName()`, `getMonthName()` - localized names

### 6. Add View Preference Storage

**File**: `apps/mobile/src/store/preferences.ts` (new or extend existing)

- Store selected view mode ('day' | 'week' | 'list')
- Persist to AsyncStorage
- Load on app startup
- Zustand store for reactive updates

### 7. Update CalendarActionSheet

**File**: `apps/mobile/src/components/CalendarActionSheet.tsx`

- Remove refresh button and related state
- Add CalendarViewToggle in header
- Conditionally render Day/Week/List view based on selection
- Pass event press handler to all view components
- Manage selected date/week state

### 8. Update CalendarScreen

**File**: `apps/mobile/src/screens/CalendarScreen.tsx`

- Remove refresh button and related state
- Add CalendarViewToggle in header
- Conditionally render Day/Week/List view based on selection
- Manage selected date/week state
- Handle navigation to chat when event is pressed

### 9. Shared Calendar Container Logic

**File**: `apps/mobile/src/components/CalendarContainer.tsx` (new)

- Shared logic for view switching, date selection, navigation
- Reusable by both CalendarScreen and CalendarActionSheet
- Reduces code duplication
- Manages view state, selected date, and event filtering

## Implementation Notes

- Use `react-native-gesture-handler` for swipe gestures (already in dependencies)
- Filter events client-side based on selected day/week (no new Firestore queries)
- Maintain smooth animations between view transitions
- Ensure all views support both light and dark themes
- Keep components under 350 LOC where possible
- Use existing gluestack-ui components for consistency
