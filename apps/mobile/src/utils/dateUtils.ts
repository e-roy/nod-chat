/**
 * Date utility functions for calendar views
 */

export interface CalendarDate {
  date: Date;
  dayOfMonth: number;
  dayName: string;
  monthName: string;
  isToday: boolean;
  timestamp: number;
}

/**
 * Get start of week (Monday) for a given date
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get end of week (Sunday) for a given date
 */
export function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

/**
 * Get array of dates for a week starting from given date
 */
export function getWeekDays(startDate: Date): CalendarDate[] {
  const start = getStartOfWeek(startDate);
  const days: CalendarDate[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    days.push({
      date,
      dayOfMonth: date.getDate(),
      dayName: getDayName(date),
      monthName: getMonthName(date),
      isToday: dateOnly.getTime() === today.getTime(),
      timestamp: date.getTime(),
    });
  }

  return days;
}

/**
 * Get day name (short version like "Mon", "Tue")
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Get month name (short version like "Jan", "Feb")
 */
export function getMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date for header display (e.g., "Monday, January 15")
 */
export function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date for week header (e.g., "Jan 15 - 21, 2024")
 */
export function formatWeekHeader(startDate: Date, endDate: Date): string {
  const startStr = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endStr = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} - ${endStr}`;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}
