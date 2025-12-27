/**
 * Error Response Handler
 * Handles error responses for the chat API.
 *
 * @module app/api/chat/handlers/error-response
 */

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Handle errors and return appropriate HTTP responses
 */
export function handleError(error: unknown): Response {
    logger.error("[Chat API] Error", { error });

    // Handle AppError
    if (error instanceof AppError) {
        return error.toResponse();
    }

    // Handle AI SDK errors
    if (error instanceof Error) {
        // Check for rate limit errors
        if (
            error.message.includes("rate limit") ||
            error.message.includes("429")
        ) {
            return Response.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        // Check for authentication errors
        if (
            error.message.includes("API key") ||
            error.message.includes("authentication")
        ) {
            return Response.json(
                { error: "AI service configuration error" },
                { status: 503 }
            );
        }
    }

    // Generic error response
    return Response.json({ error: "Internal server error" }, { status: 500 });
}
