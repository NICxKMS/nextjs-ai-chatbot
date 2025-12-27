/**
 * useStreamErrorHandler Hook
 *
 * Provides a memoized error handler for chat stream errors.
 * Extracts user-friendly messages and displays toast notifications.
 *
 * @module features/chat/hooks/use-stream-error-handler
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

/**
 * Extracts a user-friendly message from a stream error.
 */
function getUserFriendlyErrorMessage(error: Error): string {
    const defaultMessage = "An error occurred while generating the response.";

    if (error.message.includes("rate limit") || error.message.includes("429")) {
        return "Rate limit exceeded. Please wait a moment and try again.";
    }

    if (
        error.message.includes("API key") ||
        error.message.includes("authentication")
    ) {
        return "AI service configuration error. Please contact support.";
    }

    if (
        error.message.includes("timeout") ||
        error.message.includes("TIMEOUT")
    ) {
        return "The request timed out. Please try again with a shorter message.";
    }

    if (error.message.includes("network") || error.message.includes("fetch")) {
        return "Network error. Please check your connection and try again.";
    }

    // Use the actual error message if it's not too technical
    if (error.message && error.message.length < 100) {
        return error.message;
    }

    return defaultMessage;
}

/**
 * Hook that returns a memoized error handler for stream errors.
 * Logs the error and shows a user-friendly toast notification.
 *
 * @example
 * ```tsx
 * const handleStreamError = useStreamErrorHandler();
 * useChat({ onError: handleStreamError });
 * ```
 */
export function useStreamErrorHandler(): (error: Error) => void {
    return useCallback((error: Error) => {
        logger.error("[ChatProvider] Stream error", { error });

        const userMessage = getUserFriendlyErrorMessage(error);

        toast.error(userMessage, {
            duration: 5000,
            description: "Click to dismiss",
        });
    }, []);
}
