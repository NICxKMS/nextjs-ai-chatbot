/**
 * Security Constants
 *
 * Centralized security-related constants for the application.
 * P3-036: Extracted magic numbers related to security limits.
 *
 * @module lib/config/security-constants
 */

// =============================================================================
// FILE UPLOAD LIMITS
// =============================================================================

/**
 * Maximum file size for uploads (5MB).
 * Used by: app/api/files/upload/route.ts
 */
export const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Maximum file size for chat attachments (10MB).
 * Used by: features/chat/components/chat-input.tsx
 */
export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Maximum filename length after sanitization.
 * Used by: lib/utils/sanitize.ts, app/api/files/upload/route.ts
 */
export const MAX_FILENAME_LENGTH = 255;

/**
 * Maximum filename length for display (including extension).
 * Used by: app/api/files/upload/route.ts
 */
export const MAX_DISPLAY_FILENAME_LENGTH = 100;

// =============================================================================
// DOCUMENT SIZE LIMITS
// =============================================================================

/**
 * Maximum content size for text documents (1MB).
 */
export const MAX_TEXT_DOCUMENT_SIZE_BYTES = 1024 * 1024;

/**
 * Maximum content size for code documents (2MB).
 */
export const MAX_CODE_DOCUMENT_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Maximum content size for image documents (10MB).
 */
export const MAX_IMAGE_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Maximum content size for spreadsheet documents (5MB).
 */
export const MAX_SHEET_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Default maximum document content size (1MB).
 */
export const DEFAULT_MAX_DOCUMENT_SIZE_BYTES = 1024 * 1024;

// =============================================================================
// INPUT VALIDATION LIMITS
// =============================================================================

/**
 * Maximum length for chat input messages.
 */
export const MAX_CHAT_MESSAGE_LENGTH = 32_000;

/**
 * Maximum consecutive newlines in chat input.
 */
export const MAX_CONSECUTIVE_NEWLINES = 3;

/**
 * Maximum request body size (10MB).
 */
export const MAX_REQUEST_BODY_SIZE_BYTES = 10 * 1024 * 1024;

// =============================================================================
// RATE LIMITING (P3-033)
// =============================================================================

/**
 * Per-user rate limit configuration.
 *
 * The rate limiting system supports both IP-based and user-based limits:
 * - Anonymous users: Identified by IP address
 * - Authenticated users: Identified by user ID from JWT
 * - Guest users: Identified by guest ID from JWT
 *
 * @see lib/middleware/rate-limit.ts - getUserIdentifier()
 * @see lib/middleware/rate-limit-config.ts - RATE_LIMITS
 */
export const USER_RATE_LIMITS = {
    /** Standard authenticated user: 100 requests/minute */
    authenticated: {
        requests: 100,
        windowSeconds: 60,
    },
    /** Guest user: 20 requests/minute (stricter) */
    guest: {
        requests: 20,
        windowSeconds: 60,
    },
    /** Chat/AI endpoints: 50 requests/minute with burst of 10 */
    chat: {
        requests: 50,
        windowSeconds: 60,
        burst: 10,
    },
    /** File uploads: 10 requests/hour */
    upload: {
        requests: 10,
        windowSeconds: 3600,
    },
} as const;

// =============================================================================
// TIMEOUTS
// =============================================================================

/**
 * Default network request timeout (30 seconds).
 */
export const DEFAULT_NETWORK_TIMEOUT_MS = 30_000;

/**
 * Rate limit Redis timeout (1 second).
 * Controls max latency at the edge.
 */
export const RATE_LIMIT_REDIS_TIMEOUT_MS = 1000;

/**
 * Circuit breaker reset timeout (30 seconds).
 */
export const CIRCUIT_BREAKER_RESET_TIMEOUT_MS = 30_000;

// =============================================================================
// CACHE TTLs
// =============================================================================

/**
 * Document preview cache TTL (5 minutes).
 */
export const DOCUMENT_PREVIEW_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Session cache TTL (1 hour).
 */
export const SESSION_CACHE_TTL_SECONDS = 3600;

/**
 * Guest session TTL (1 hour).
 */
export const GUEST_SESSION_TTL_SECONDS = 3600;

/**
 * Auth session TTL (24 hours).
 */
export const AUTH_SESSION_TTL_SECONDS = 24 * 60 * 60;

// =============================================================================
// CLIENT-SIDE RATE LIMITS
// =============================================================================

/**
 * Client-side message submission rate limit.
 * Used by: features/chat/components/chat-input.tsx
 */
export const CLIENT_SUBMIT_RATE_LIMIT = {
    maxRequests: 10,
    windowMs: 60_000,
} as const;

/**
 * Client-side file upload rate limit.
 * Used by: features/chat/components/chat-input.tsx
 */
export const CLIENT_UPLOAD_RATE_LIMIT = {
    maxRequests: 5,
    windowMs: 60_000,
} as const;

/**
 * Maximum concurrent file uploads.
 */
export const MAX_CONCURRENT_UPLOADS = 3;
