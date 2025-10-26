/**
 * Format a timestamp to a compact date string for AI context
 * Uses compact format to save space in AI summaries
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string like "Mar 15, 3:45 PM" or "Dec 25, 2023"
 */
export function formatMessageDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  // If same year, don't include year
  if (date.getFullYear() === now.getFullYear()) {
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr}, ${timeStr}`;
  }

  // Different year - include year
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr}, ${timeStr}`;
}

/**
 * Get current date and time context for AI prompts
 * Provides context so AI understands what "today" means
 *
 * @returns Formatted current date and time string
 */
export function getCurrentDateContext(): string {
  const now = new Date();

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dateStr} at ${timeStr}`;
}
