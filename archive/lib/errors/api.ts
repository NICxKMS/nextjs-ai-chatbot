/**
 * API Error Classes
 * Ref: REQ-018 (Typed Error Handling)
 *
 * Typed error subclasses for HTTP/API errors
 */

import { AppError } from "./app-error";

/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super({
            code: "validation:invalid_input",
            message,
            statusCode: 400,
            isOperational: true,
            context,
        });
        this.name = "ValidationError";
    }
}

/**
 * Authentication error (401 Unauthorized)
 */
export class AuthenticationError extends AppError {
    constructor(
        message = "Authentication required",
        context?: Record<string, unknown>
    ) {
        super({
            code: "auth:unauthorized",
            message,
            statusCode: 401,
            isOperational: true,
            context,
        });
        this.name = "AuthenticationError";
    }
}

/**
 * Authorization error (403 Forbidden)
 */
export class AuthorizationError extends AppError {
    constructor(
        message = "Permission denied",
        context?: Record<string, unknown>
    ) {
        super({
            code: "auth:forbidden",
            message,
            statusCode: 403,
            isOperational: true,
            context,
        });
        this.name = "AuthorizationError";
    }
}

/**
 * Not found error (404 Not Found)
 */
export class NotFoundError extends AppError {
    constructor(resource: string, context?: Record<string, unknown>) {
        super({
            code: `resource:not_found:${resource}` as `resource:${string}`,
            message: `${resource} not found`,
            statusCode: 404,
            isOperational: true,
            context: { resource, ...context },
        });
        this.name = "NotFoundError";
    }
}

/**
 * Rate limit error (429 Too Many Requests)
 */
export class RateLimitError extends AppError {
    constructor(retryAfter?: number, context?: Record<string, unknown>) {
        super({
            code: "rate_limit:exceeded",
            message: "Rate limit exceeded",
            statusCode: 429,
            isOperational: true,
            context: { retryAfter, ...context },
        });
        this.name = "RateLimitError";
    }
}

/**
 * Service unavailable error (503 Service Unavailable)
 */
export class ServiceUnavailableError extends AppError {
    constructor(service: string, context?: Record<string, unknown>) {
        super({
            code: `external:${service}` as `external:${string}`,
            message: `${service} is temporarily unavailable`,
            statusCode: 503,
            isOperational: true,
            context: { service, ...context },
        });
        this.name = "ServiceUnavailableError";
    }
}

/**
 * Conflict error (409 Conflict)
 */
export class ConflictError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super({
            code: "resource:conflict",
            message,
            statusCode: 409,
            isOperational: true,
            context,
        });
        this.name = "ConflictError";
    }
}
