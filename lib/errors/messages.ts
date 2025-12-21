/**
 * Error Message Catalog
 * Ref: 01-error-handling-optimal-design.md §5
 *
 * Extracted from OldApp: oldapp/lib/errors.ts
 */

import type { ErrorCode, MessageConfig } from "./types";

const messages: Record<string, MessageConfig> = {
    // Auth errors
    "auth:unauthorized": {
        default: "You need to sign in before continuing.",
        guest: "Sign in to access this feature.",
    },
    "auth:forbidden": {
        default: "Your account does not have access to this feature.",
    },
    "auth:session_expired": {
        default: "Your session has expired. Please sign in again.",
    },
    "auth:invalid_credentials": {
        default: "Invalid email or password.",
    },
    "auth:guest_not_configured": {
        default: "Guest authentication is not configured.",
    },

    // Validation errors
    "validation:invalid_input": {
        default: "The provided input is invalid.",
    },
    "validation:missing_field": {
        default: "A required field is missing.",
    },
    "validation:invalid_format": {
        default: "The input format is invalid.",
    },

    // Resource errors
    "resource:not_found": {
        default: "The requested resource was not found.",
    },
    "resource:not_found:chat": {
        default: "The requested chat was not found.",
        guest: "Chat not found. Guest chat history is temporary and may have expired.",
    },
    "resource:not_found:document": {
        default: "The requested document was not found.",
    },
    "resource:not_found:message": {
        default: "The requested message was not found.",
    },
    "resource:not_found:user": {
        default: "User not found.",
    },
    "resource:already_exists": {
        default: "A record with the same value already exists.",
    },
    "resource:access_denied": {
        default: "This resource belongs to another user.",
        guest: "You don't have access to this resource.",
    },

    // Rate limit errors
    "rate_limit:exceeded": {
        default: "Too many requests. Please try again later.",
    },
    "rate_limit:daily_exceeded": {
        default:
            "You have exceeded your maximum number of messages for the day. Please try again later.",
        guest: "Daily message limit exceeded. Sign in to increase your message allowance.",
    },

    // External errors
    "external:service_unavailable": {
        default:
            "An external service is currently unavailable. Please try again later.",
    },
    "external:timeout": {
        default: "The request timed out. Please try again.",
    },
    "external:database:connection_failure": {
        default: "Unable to connect to the database. Please try again later.",
    },
    "external:ai_provider": {
        default: "AI service is temporarily unavailable. Please try again.",
    },

    // Internal errors
    "internal:unknown": {
        default: "An unexpected error occurred. Please try again.",
    },
    "internal:configuration": {
        default: "Server configuration error.",
    },
};

/**
 * Get error message by code
 * @param code - Error code
 * @param isGuest - Whether user is a guest
 * @param variant - Optional variant key
 */
export function getMessage(
    code: ErrorCode,
    isGuest = false,
    variant?: string
): string {
    const config = messages[code];

    if (!config) {
        // Try parent code (e.g., 'auth:unauthorized' for 'auth:unauthorized:expired')
        const parts = code.split(":");
        if (parts.length > 2) {
            const parentCode = parts.slice(0, 2).join(":") as ErrorCode;
            return getMessage(parentCode, isGuest, variant);
        }
        return "An error occurred.";
    }

    if (variant && config.variants?.[variant]) {
        return config.variants[variant];
    }

    if (isGuest && config.guest) {
        return config.guest;
    }

    return config.default;
}

/**
 * Register custom error messages (for feature modules)
 */
export function registerMessages(
    newMessages: Record<string, MessageConfig>
): void {
    Object.assign(messages, newMessages);
}
