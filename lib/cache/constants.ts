/**
 * Cache Constants
 * Ref: 04-cache-layer-optimal-design.md §4
 *
 * Extracted from OldApp: oldapp/lib/auth/session.ts, oldapp/lib/cache/operations.ts
 */

/** Guest user cache TTL: 7 days */
export const GUEST_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 604,800

/** Daily quota TTL: 25 hours (ensures reset after midnight in all timezones) */
export const QUOTA_TTL_SECONDS = 25 * 60 * 60; // 90,000

/** Circuit breaker: failures before opening */
export const CIRCUIT_FAILURE_THRESHOLD = 5;

/** Circuit breaker: reset timeout in ms */
export const CIRCUIT_RESET_TIMEOUT_MS = 30_000; // 30 seconds
