/**
 * Chat API Route
 * Ref: 05-ai-integration-optimal-design.md §4
 *
 * Thin orchestrator that delegates to modular handlers.
 * Handles streaming AI responses using Vercel AI SDK.
 *
 * @module app/api/chat/route
 */

import {
    convertMessages,
    createStreamResponse,
    handleError,
    processMessage,
    validateChatRequest,
} from "./handlers";

// =============================================================================
// REQUEST HANDLER
// =============================================================================

/**
 * POST /api/chat
 * Handles chat message submission and streams AI response.
 *
 * Flow:
 * 1. Validate request (auth, body, model, guest restrictions)
 * 2. Process message (convert format, create tool session)
 * 3. Stream response (AI generation, persistence, SSE)
 */
export async function POST(request: Request): Promise<Response> {
    try {
        // Step 1: Validate request
        const validatedRequest = await validateChatRequest(request);

        // Step 2: Process message context
        const context = processMessage(validatedRequest);
        const coreMessages = convertMessages(validatedRequest);

        // Step 3: Create and return streaming response
        return createStreamResponse(request, context, coreMessages);
    } catch (error) {
        return handleError(error);
    }
}
