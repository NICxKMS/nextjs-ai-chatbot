/**
 * Request Validation Handler
 * Validates and parses incoming chat API requests.
 *
 * @module app/api/chat/handlers/validate-request
 */

import type { UIMessage } from "ai";
import { DEFAULT_MODEL_ID, isValidModel } from "@/lib/ai";
import { getSessionCached } from "@/lib/auth";
import { forbiddenError, validationError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";
import {
    chatRequestSchema,
    GUEST_ALLOWED_MODELS,
    type ValidatedChatRequest,
} from "../types";

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Parse and validate the request body
 */
async function parseRequestBody(
    request: Request
): Promise<{ chatId: string; messages: UIMessage[]; modelId: string }> {
    const rawBody = await request.json().catch(() => null);
    if (rawBody === null) {
        throw validationError("Invalid JSON in request body");
    }

    const parseResult = chatRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
        const errors = parseResult.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ");
        throw validationError(`Invalid request: ${errors}`);
    }

    const { id: chatId, modelId = DEFAULT_MODEL_ID } = parseResult.data;
    const messages = parseResult.data.messages as UIMessage[];

    return { chatId, messages, modelId };
}

/**
 * Validate model selection
 */
function validateModel(modelId: string): void {
    if (!isValidModel(modelId)) {
        // OPT-P0-002: Generic error message - don't expose model ID to clients
        logger.warn("[Chat API] Invalid model requested", { modelId });
        throw validationError("Invalid model configuration");
    }
}

/**
 * Validate guest restrictions and log access
 */
function validateGuestAccess(
    request: Request,
    modelId: string,
    chatId: string
): void {
    // Guests can only use affordable models to prevent cost abuse
    if (!GUEST_ALLOWED_MODELS.has(modelId)) {
        // OPT-P0-002: Log details server-side, but don't include in error response
        // Security: Prevents model enumeration attacks
        logger.warn("[Chat API] Guest attempted restricted model", {
            modelId,
            allowedModels: Array.from(GUEST_ALLOWED_MODELS),
        });
        throw forbiddenError("model", {
            reason: "Model configuration error",
        });
    }

    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

    logger.info("[Chat API] Guest access", {
        ip,
        modelId,
        chatId,
    });
}

/**
 * Extract user message content for title generation
 */
function extractUserMessageContent(messages: UIMessage[]): string {
    const lastUserMessage = messages.find(
        (m): m is UIMessage & { role: "user"; content: string } =>
            m.role === "user" &&
            typeof (m as { content?: unknown }).content === "string"
    );
    return lastUserMessage?.content ?? "";
}

// =============================================================================
// MAIN VALIDATION HANDLER
// =============================================================================

/**
 * Validate incoming chat request
 * Handles authentication, body parsing, model validation, and guest restrictions.
 *
 * @param request - The incoming request
 * @returns Validated request data
 */
export async function validateChatRequest(
    request: Request
): Promise<ValidatedChatRequest> {
    // Get session (optional - guests can chat with restrictions)
    const session = await getSessionCached();
    const userId = session?.user?.id;
    const isGuest = !session || session.user?.type === "guest";

    // Parse and validate request body
    const { chatId, messages, modelId } = await parseRequestBody(request);

    // Validate model
    validateModel(modelId);

    // Apply guest restrictions if applicable
    if (isGuest) {
        validateGuestAccess(request, modelId, chatId);
    }

    // Check if this is a new chat (only 1 user message)
    const isNewChat = messages.filter((m) => m.role === "user").length === 1;

    // Extract user message content for title generation
    const userMessageContent = extractUserMessageContent(messages);

    return {
        chatId,
        messages,
        modelId,
        session,
        userId,
        isGuest,
        isNewChat,
        userMessageContent,
    };
}
