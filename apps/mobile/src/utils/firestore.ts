/**
 * Safely convert a timestamp from Firestore to milliseconds
 * Handles both Firestore Timestamp objects and plain numbers
 */
export const toTimestamp = (data: any): number => {
  // If it's a Firestore Timestamp, use toMillis()
  if (data?.toMillis) {
    return data.toMillis();
  }
  // If it's already a number in milliseconds
  if (typeof data === 'number') {
    return data;
  }
  // If it's a number in seconds (Unix timestamp), convert to milliseconds
  if (typeof data === 'number' && data < 10000000000) {
    return data * 1000;
  }
  // Last resort: current time (shouldn't happen with proper data)
  console.warn('Invalid timestamp in Firestore data:', data);
  return Date.now();
};
