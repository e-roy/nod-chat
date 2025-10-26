/**
 * Formats a timestamp into a human-readable relative time string
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string
 *
 * Examples:
 * - "5 mins ago" (up to 6 hours)
 * - "2 hrs ago" (up to 6 hours)
 * - "3:45 PM" (same day, after 6 hours)
 * - "Yesterday" (previous day)
 * - "Dec 15" (different day)
 */
export const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  // Show relative time for recent messages (up to 6 hours)
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 6) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;

  const messageDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if it's the same day
  const isSameDay =
    messageDate.getDate() === today.getDate() &&
    messageDate.getMonth() === today.getMonth() &&
    messageDate.getFullYear() === today.getFullYear();

  // Check if it's yesterday
  const isYesterday =
    messageDate.getDate() === yesterday.getDate() &&
    messageDate.getMonth() === yesterday.getMonth() &&
    messageDate.getFullYear() === yesterday.getFullYear();

  if (isSameDay) {
    // Show time for same day (after 6 hours)
    return messageDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else if (isYesterday) {
    return 'Yesterday';
  } else {
    // Show date for different days
    return messageDate.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
  }
};

/**
 * Formats a timestamp as a relative time string (e.g., "5 mins ago", "2 hours ago")
 */
export const formatDistanceToNow = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

  return new Date(timestamp).toLocaleDateString();
};
