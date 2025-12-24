/**
 * AI Error Classes
 * Ref: REQ-018 (Typed Error Handling)
 *
 * Typed error subclasses for AI provider errors
 */

import { AppError } from "./app-error";

/**
 * AI provider error (502 Bad Gateway)
 * Used when an AI provider returns an error or is unreachable
 */
export class AIProviderError extends AppError {
    constructor(
        provider: string,
        message: string,
        context?: Record<string, unknown>
    ) {
        super({
            code: `external:ai_provider:${provider}` as `external:${string}`,
            message,
            statusCode: 502,
            isOperational: true,
            context: { provider, ...context },
        });
        this.name = "AIProviderError";
    }
}

/**
 * Model not found error (400 Bad Request)
 * Used when requested model is not available or configured
 */
export class ModelNotFoundError extends AppError {
    constructor(modelId: string, context?: Record<string, unknown>) {
        super({
            code: "validation:model_not_found",
            message: "Invalid model configuration",
            statusCode: 400,
            isOperational: true,
            context: { modelId, ...context },
        });
        this.name = "ModelNotFoundError";
    }
}

/**
 * Token limit error (400 Bad Request)
 * Used when request exceeds token limits
 */
export class TokenLimitError extends AppError {
    constructor(
        limit: number,
        requested: number,
        context?: Record<string, unknown>
    ) {
        super({
            code: "validation:token_limit",
            message: "Token limit exceeded",
            statusCode: 400,
            isOperational: true,
            context: { limit, requested, ...context },
        });
        this.name = "TokenLimitError";
    }
}

/**
 * Content filter error (400 Bad Request)
 * Used when content is blocked by provider safety filters
 */
export class ContentFilterError extends AppError {
    constructor(reason?: string, context?: Record<string, unknown>) {
        super({
            code: "validation:content_filtered",
            message: reason ?? "Content blocked by safety filter",
            statusCode: 400,
            isOperational: true,
            context,
        });
        this.name = "ContentFilterError";
    }
}

/**
 * Streaming error (500 Internal Server Error)
 * Used when streaming response fails mid-stream
 */
export class StreamingError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super({
            code: "internal:streaming_error",
            message,
            statusCode: 500,
            isOperational: true,
            context,
        });
        this.name = "StreamingError";
    }
}
