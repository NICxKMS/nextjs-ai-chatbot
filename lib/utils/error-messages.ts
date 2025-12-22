/**
 * User-Friendly Error Messages
 *
 * Maps technical error codes and messages to user-friendly descriptions.
 * This improves UX by providing actionable, understandable error feedback.
 *
 * @module lib/utils/error-messages
 */

// =============================================================================
// Types
// =============================================================================

export interface FriendlyError {
    title: string;
    message: string;
    action?: string;
}

// =============================================================================
// Error Message Mappings
// =============================================================================

/**
 * Map of known error codes to user-friendly messages.
 */
const ERROR_MESSAGE_MAP: Record<string, FriendlyError> = {
    // Authentication errors
    "auth:unauthorized": {
        title: "Sign in required",
        message: "Please sign in to continue.",
        action: "Sign In",
    },
    "auth:forbidden": {
        title: "Access denied",
        message: "You don't have permission to access this resource.",
    },
    "auth:session_expired": {
        title: "Session expired",
        message: "Your session has expired. Please sign in again.",
        action: "Sign In",
    },
    "auth:invalid_credentials": {
        title: "Invalid credentials",
        message:
            "The email or password you entered is incorrect. Please try again.",
    },
    "auth:email_not_verified": {
        title: "Email not verified",
        message:
            "Please check your email and click the verification link before signing in.",
        action: "Resend Email",
    },
    "auth:user_already_exists": {
        title: "Account exists",
        message:
            "An account with this email already exists. Try signing in instead.",
        action: "Sign In",
    },
    "auth:weak_password": {
        title: "Password too weak",
        message:
            "Please choose a stronger password with at least 6 characters.",
    },

    // Validation errors
    "validation:invalid_input": {
        title: "Invalid input",
        message: "Please check your input and try again.",
    },
    "validation:missing_field": {
        title: "Missing information",
        message: "Please fill in all required fields.",
    },
    "validation:invalid_email": {
        title: "Invalid email",
        message: "Please enter a valid email address.",
    },
    "validation:invalid_format": {
        title: "Invalid format",
        message:
            "The format of your input is invalid. Please check and try again.",
    },

    // Rate limit errors
    "rate_limit:exceeded": {
        title: "Too many requests",
        message:
            "You're making requests too quickly. Please wait a moment and try again.",
    },
    "rate_limit:daily_exceeded": {
        title: "Daily limit reached",
        message:
            "You've reached your daily limit. Please try again tomorrow or upgrade your plan.",
    },

    // Network errors
    "network:offline": {
        title: "No connection",
        message: "Please check your internet connection and try again.",
        action: "Retry",
    },
    "network:timeout": {
        title: "Request timed out",
        message: "The server took too long to respond. Please try again.",
        action: "Retry",
    },

    // Resource errors
    "resource:not_found": {
        title: "Not found",
        message: "The requested resource could not be found.",
    },
    "resource:not_found:chat": {
        title: "Chat not found",
        message: "This chat doesn't exist or may have been deleted.",
        action: "Start New Chat",
    },
    "resource:not_found:document": {
        title: "Document not found",
        message: "This document doesn't exist or may have been deleted.",
    },

    // External service errors
    "external:service_unavailable": {
        title: "Service unavailable",
        message:
            "An external service is temporarily unavailable. Please try again later.",
        action: "Retry",
    },
    "external:ai_error": {
        title: "AI service error",
        message: "There was an issue with the AI service. Please try again.",
        action: "Retry",
    },

    // File errors
    "file:too_large": {
        title: "File too large",
        message: "The file you're trying to upload exceeds the size limit.",
    },
    "file:invalid_type": {
        title: "Invalid file type",
        message:
            "This file type is not supported. Please try a different file.",
    },
    "file:upload_failed": {
        title: "Upload failed",
        message: "Failed to upload your file. Please try again.",
        action: "Retry",
    },
};

/**
 * Common Supabase error messages mapped to friendly messages.
 */
const SUPABASE_ERROR_MAP: Record<string, FriendlyError> = {
    "Invalid login credentials": {
        title: "Invalid credentials",
        message: "The email or password you entered is incorrect.",
    },
    "Email not confirmed": {
        title: "Email not verified",
        message: "Please check your email and click the verification link.",
        action: "Resend Email",
    },
    "User already registered": {
        title: "Account exists",
        message: "An account with this email already exists.",
        action: "Sign In",
    },
    "Password should be at least 6 characters": {
        title: "Password too short",
        message: "Please use a password with at least 6 characters.",
    },
    "Unable to validate email address: invalid format": {
        title: "Invalid email",
        message: "Please enter a valid email address.",
    },
    "Signups not allowed for this instance": {
        title: "Registration disabled",
        message: "New account registration is currently disabled.",
    },
    "Rate limit exceeded": {
        title: "Too many attempts",
        message: "Please wait a few minutes before trying again.",
    },
};

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Get a user-friendly error message for an error code.
 *
 * @param code - The error code (e.g., "auth:invalid_credentials")
 * @returns User-friendly error object
 */
export function getFriendlyError(code: string): FriendlyError {
    const mapped = ERROR_MESSAGE_MAP[code];
    if (mapped) {
        return mapped;
    }

    // Try category fallback (e.g., "auth:unknown" -> "auth:unauthorized")
    const [category] = code.split(":");
    const categoryFallback =
        ERROR_MESSAGE_MAP[`${category}:unauthorized`] ??
        ERROR_MESSAGE_MAP[`${category}:invalid_input`];

    if (categoryFallback) {
        return {
            ...categoryFallback,
            message: "An unexpected error occurred. Please try again.",
        };
    }

    return {
        title: "Something went wrong",
        message: "An unexpected error occurred. Please try again.",
        action: "Retry",
    };
}

/**
 * Convert a Supabase error message to a user-friendly message.
 *
 * @param supabaseMessage - The error message from Supabase
 * @returns User-friendly error object
 */
export function mapSupabaseError(supabaseMessage: string): FriendlyError {
    // Direct match
    const directMatch = SUPABASE_ERROR_MAP[supabaseMessage];
    if (directMatch) {
        return directMatch;
    }

    // Partial match for common patterns
    const lowerMessage = supabaseMessage.toLowerCase();

    if (
        lowerMessage.includes("invalid login") ||
        lowerMessage.includes("invalid credentials")
    ) {
        return (
            SUPABASE_ERROR_MAP["Invalid login credentials"] ?? {
                title: "Invalid credentials",
                message: "The email or password you entered is incorrect.",
            }
        );
    }

    if (
        lowerMessage.includes("email not confirmed") ||
        lowerMessage.includes("email not verified")
    ) {
        return (
            SUPABASE_ERROR_MAP["Email not confirmed"] ?? {
                title: "Email not verified",
                message:
                    "Please check your email and click the verification link.",
            }
        );
    }

    if (
        lowerMessage.includes("already registered") ||
        lowerMessage.includes("already exists")
    ) {
        return (
            SUPABASE_ERROR_MAP["User already registered"] ?? {
                title: "Account exists",
                message: "An account with this email already exists.",
            }
        );
    }

    if (
        lowerMessage.includes("password") &&
        lowerMessage.includes("character")
    ) {
        return (
            SUPABASE_ERROR_MAP["Password should be at least 6 characters"] ?? {
                title: "Password too short",
                message: "Please use a password with at least 6 characters.",
            }
        );
    }

    if (lowerMessage.includes("rate limit")) {
        return (
            SUPABASE_ERROR_MAP["Rate limit exceeded"] ?? {
                title: "Too many attempts",
                message: "Please wait a few minutes before trying again.",
            }
        );
    }

    // Default fallback
    return {
        title: "Authentication error",
        message:
            supabaseMessage ||
            "An authentication error occurred. Please try again.",
    };
}

/**
 * Convert an HTTP status code to a user-friendly message.
 *
 * @param status - HTTP status code
 * @param context - Optional context (e.g., "upload", "login")
 * @returns User-friendly error object
 */
export function mapHttpError(status: number, context?: string): FriendlyError {
    switch (status) {
        case 400:
            return getFriendlyError("validation:invalid_input");
        case 401:
            return getFriendlyError("auth:unauthorized");
        case 403:
            return getFriendlyError("auth:forbidden");
        case 404:
            return getFriendlyError(
                `resource:not_found${context ? `:${context}` : ""}`
            );
        case 408:
            return getFriendlyError("network:timeout");
        case 413:
            return getFriendlyError("file:too_large");
        case 429:
            return getFriendlyError("rate_limit:exceeded");
        case 500:
        case 502:
        case 503:
        case 504:
            return {
                title: "Server error",
                message:
                    "Our servers are having trouble. Please try again in a moment.",
                action: "Retry",
            };
        default:
            return {
                title: "Request failed",
                message: `The request failed (Error ${status}). Please try again.`,
                action: "Retry",
            };
    }
}

/**
 * Extract a user-friendly message from any error object.
 *
 * @param error - Error object or unknown value
 * @param fallback - Fallback message if extraction fails
 * @returns User-friendly error message string
 */
export function extractErrorMessage(
    error: unknown,
    fallback = "An unexpected error occurred. Please try again."
): string {
    if (!error) {
        return fallback;
    }

    // Handle Error objects
    if (error instanceof Error) {
        // Check for Supabase-style errors
        const supabaseError = mapSupabaseError(error.message);
        if (supabaseError.message !== error.message) {
            return supabaseError.message;
        }
        return error.message || fallback;
    }

    // Handle objects with message property
    if (typeof error === "object" && "message" in error) {
        const message = (error as { message: unknown }).message;
        if (typeof message === "string") {
            return message;
        }
    }

    // Handle string errors
    if (typeof error === "string") {
        return error || fallback;
    }

    return fallback;
}
