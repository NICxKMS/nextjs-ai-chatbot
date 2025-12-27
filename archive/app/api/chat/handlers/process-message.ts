/**
 * Message Processing Handler
 * Prepares messages and context for AI streaming.
 *
 * @module app/api/chat/handlers/process-message
 */

import { type CoreMessage, convertToModelMessages } from "ai";
import type { AppSession } from "@/lib/auth/types";
import { generateUUID } from "@/lib/utils";
import type { StreamContext, ValidatedChatRequest } from "../types";

// =============================================================================
// MESSAGE PROCESSING
// =============================================================================

/**
 * Convert UI messages to core messages for the AI SDK
 */
export function convertMessages(request: ValidatedChatRequest): CoreMessage[] {
    return convertToModelMessages(request.messages);
}

/**
 * Create a session for tools
 * Uses real session or creates guest session
 */
function createToolSession(session: AppSession | null): AppSession {
    if (session) {
        return session;
    }

    return {
        user: {
            id: `guest:${generateUUID()}`,
            type: "guest",
            email: null,
        },
    };
}

// =============================================================================
// MAIN PROCESSING HANDLER
// =============================================================================

/**
 * Process the validated request and prepare streaming context
 *
 * @param validatedRequest - The validated chat request
 * @returns Context for stream handling
 */
export function processMessage(
    validatedRequest: ValidatedChatRequest
): StreamContext {
    const toolSession = createToolSession(validatedRequest.session);

    return {
        request: validatedRequest,
        toolSession,
    };
}
