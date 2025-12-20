/**
 * Cache Helpers
 * Ref: 04-cache-layer-optimal-design.md §8
 *
 * Utility functions for cache operations
 */
import 'server-only';

/**
 * Check if userId is a guest user
 * Guest IDs don't have hyphens (nanoid format)
 */
export function isGuestUserId(userId: string): boolean {
  return !userId.includes('-');
}

/**
 * Get message score for ZSET ordering
 * Combines timestamp with role offset for deterministic ordering
 */
export function getMessageScore(createdAt: Date | number, role: string): number {
  const timestamp =
    typeof createdAt === 'number' ? createdAt : createdAt.getTime();

  // Add small offset based on role to maintain order within same timestamp
  const roleOffset = role === 'user' ? 0 : role === 'assistant' ? 0.1 : 0.2;

  return timestamp + roleOffset;
}

/**
 * Parse message score to extract timestamp
 */
export function parseMessageScore(score: number): number {
  return Math.floor(score);
}

/**
 * Get current date string for quota key
 */
export function getQuotaDateKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Serialize value for Redis storage
 */
export function serialize<T>(value: T): string {
  return JSON.stringify(value);
}

/**
 * Deserialize value from Redis storage
 */
export function deserialize<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Convert Date to Unix timestamp (seconds)
 */
export function toUnixTimestamp(date: Date | string | number): number {
  if (typeof date === 'number') return Math.floor(date / 1000);
  const d = typeof date === 'string' ? new Date(date) : date;
  return Math.floor(d.getTime() / 1000);
}

/**
 * Convert Unix timestamp (seconds) to Date
 */
export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
