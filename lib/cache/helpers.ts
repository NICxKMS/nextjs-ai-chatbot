/**
 * Cache Helpers
 * Ref: 04-cache-layer-optimal-design.md §8
 *
 * Utility functions for cache operations
 */
import "server-only";

import {
    AUTH_CHAT_DATA_TTL_SECONDS,
    AUTH_SESSION_TTL_SECONDS,
    GUEST_CACHE_TTL_SECONDS,
    GUEST_SESSION_TTL_SECONDS,
} from "./constants";

/**
 * Check if userId is a guest user
 * Guest IDs don't have hyphens (nanoid format)
 */
export function isGuestUserId(userId: string): boolean {
    return !userId.includes("-");
}

/**
 * Get message score for ZSET ordering
 * Combines timestamp with role offset for deterministic ordering
 */
export function getMessageScore(
    createdAt: Date | number,
    role: string
): number {
    const timestamp =
        typeof createdAt === "number" ? createdAt : createdAt.getTime();

    // Add small offset based on role to maintain order within same timestamp
    const roleOffset = role === "user" ? 0 : role === "assistant" ? 0.1 : 0.2;

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
 *
 * Note: Upstash Redis auto-deserializes JSON values when retrieving.
 * This function handles both cases:
 * - If value is already an object (Upstash auto-deserialized), return as-is
 * - If value is a string (from Lua scripts or raw storage), parse it
 */
export function deserialize<T>(value: unknown): T | null {
    if (value === null || value === undefined) {
        return null;
    }
    // If already an object (Upstash auto-deserialized), return as-is
    if (typeof value === "object") {
        return value as T;
    }
    // If string, try to parse
    if (typeof value === "string") {
        try {
            return JSON.parse(value) as T;
        } catch {
            return null;
        }
    }
    return null;
}

/**
 * Convert Date to Unix timestamp in seconds
 * Use for TTL calculations and standard Unix time comparisons
 */
export function toUnixTimestampSeconds(date: Date | string | number): number {
    if (typeof date === "number") {
        return Math.floor(date / 1000);
    }
    const d = typeof date === "string" ? new Date(date) : date;
    return Math.floor(d.getTime() / 1000);
}

/**
 * Convert Date to Unix timestamp in milliseconds
 * Use for ZSET scores where millisecond precision is needed
 */
export function toUnixTimestampMs(date: Date | string | number): number {
    if (typeof date === "number") {
        return date;
    }
    const d = typeof date === "string" ? new Date(date) : date;
    return d.getTime();
}

/**
 * Convert Date to Unix timestamp (seconds)
 * @deprecated Use toUnixTimestampSeconds for clarity
 */
export function toUnixTimestamp(date: Date | string | number): number {
    return toUnixTimestampSeconds(date);
}

/**
 * Convert Unix timestamp (seconds) to Date
 */
export function fromUnixTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
}

/**
 * Get appropriate TTL based on user type
 */
export function getTTLForUser(
    isGuest: boolean,
    entityType: "chat" | "session" = "chat"
): number {
    if (entityType === "session") {
        return isGuest ? GUEST_SESSION_TTL_SECONDS : AUTH_SESSION_TTL_SECONDS;
    }
    return isGuest ? GUEST_CACHE_TTL_SECONDS : AUTH_CHAT_DATA_TTL_SECONDS;
}

/**
 * Get TTL in seconds (for Lua scripts)
 */
export function getGuestTTL(isGuest: boolean): number {
    return isGuest ? GUEST_CACHE_TTL_SECONDS : AUTH_CHAT_DATA_TTL_SECONDS;
}

/**
 * Apply guest-specific TTL (legacy compat)
 * Returns undefined for authenticated users (no expiry)
 */
export function applyGuestTTL(isGuest: boolean): number | undefined {
    return isGuest ? GUEST_CACHE_TTL_SECONDS : undefined;
}
