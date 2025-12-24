/**
 * Error Message Catalog
 * Ref: 01-error-handling-optimal-design.md §5
 *
 * @deprecated This module is a compatibility layer. For new code, import directly from:
 *   `import { getFriendlyError } from '@/lib/utils/error-messages'`
 *
 * This module re-exports from lib/utils/error-messages.ts (the source of truth)
 * and provides backward-compatible getMessage() for existing consumers.
 */

import {
    type FriendlyError,
    getFriendlyError,
} from "@/lib/utils/error-messages";
import type { ErrorCode, MessageConfig } from "./types";

// Re-export for consumers who want the richer UI-oriented types
export {
    type FriendlyError,
    getFriendlyError,
} from "@/lib/utils/error-messages";

/**
 * Guest-specific message overrides.
 * These provide alternative messages for guest users where applicable.
 */
const GUEST_OVERRIDES: Record<string, string> = {
    "auth:unauthorized": "Sign in to access this feature.",
    "resource:not_found:chat":
        "Chat not found. Guest chat history is temporary and may have expired.",
    "resource:access_denied": "You don't have access to this resource.",
    "rate_limit:daily_exceeded":
        "Daily message limit exceeded. Sign in to increase your message allowance.",
};

/**
 * Custom messages registry for feature modules.
 * Allows runtime registration of additional error messages.
 */
const customMessages: Record<string, MessageConfig> = {};

/**
 * Convert FriendlyError to MessageConfig format.
 * This bridges the UI-oriented format to the simpler API format.
 */
function toMessageConfig(friendly: FriendlyError, code: string): MessageConfig {
    return {
        default: friendly.message,
        guest: GUEST_OVERRIDES[code],
    };
}

/**
 * Get error message by code.
 *
 * @deprecated For new UI code, use `getFriendlyError()` which provides richer
 *   information including title and action buttons.
 *
 * @param code - Error code (e.g., 'auth:unauthorized')
 * @param isGuest - Whether user is a guest (returns guest-specific message if available)
 * @param variant - Optional variant key for custom message variants
 * @returns Plain text error message
 */
export function getMessage(
    code: ErrorCode,
    isGuest = false,
    variant?: string
): string {
    // Check custom registered messages first
    const customConfig = customMessages[code];
    if (customConfig) {
        if (variant && customConfig.variants?.[variant]) {
            return customConfig.variants[variant];
        }
        if (isGuest && customConfig.guest) {
            return customConfig.guest;
        }
        return customConfig.default;
    }

    // Get from source of truth (lib/utils/error-messages.ts)
    const friendly = getFriendlyError(code);
    const config = toMessageConfig(friendly, code);

    // Handle guest-specific messages
    if (isGuest && config.guest) {
        return config.guest;
    }

    // Handle parent code fallback for deeply nested codes
    if (friendly.title === "Something went wrong") {
        const parts = code.split(":");
        if (parts.length > 2) {
            const parentCode = parts.slice(0, 2).join(":") as ErrorCode;
            return getMessage(parentCode, isGuest, variant);
        }
    }

    return config.default;
}

/**
 * Register custom error messages (for feature modules).
 *
 * Use this to add module-specific error messages at runtime.
 * Custom messages take precedence over the default message catalog.
 *
 * @param newMessages - Record of error codes to MessageConfig
 */
export function registerMessages(
    newMessages: Record<string, MessageConfig>
): void {
    Object.assign(customMessages, newMessages);
}
