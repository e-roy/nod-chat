import { faker } from "@faker-js/faker";

/**
 * Generate a unique ID with a prefix
 */
export function generateId(prefix: string): string {
  return `${prefix}_${faker.string.uuid()}`;
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array
 */
export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Pick multiple random elements from an array
 */
export function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generate a random timestamp in the past
 */
export function getRandomTimestamp(daysAgo: number = 7): number {
  const now = Date.now();
  const maxOffset = daysAgo * 24 * 60 * 60 * 1000;
  const offset = Math.random() * maxOffset;
  return now - offset;
}

/**
 * Generate a profile picture URL using DiceBear
 */
export function generateProfilePicture(seed: number): string {
  return `https://api.dicebear.com/7.x/personas/png?seed=${seed}&size=200`;
}

/**
 * Generate an image URL using Lorem Picsum
 */
export function generateImageUrl(seed: number): string {
  return `https://picsum.photos/400/300?random=${seed}`;
}
