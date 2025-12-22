/**
 * Type Guards for API Responses
 *
 * Runtime type checking functions for validating data from external sources
 * (API responses, database queries, user input).
 *
 * @module lib/types/guards
 */

/**
 * Type guard for checking if a value is a non-null object.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is an array.
 */
export function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

/**
 * Type guard for checking if a value is a string.
 */
export function isString(value: unknown): value is string {
    return typeof value === "string";
}

/**
 * Type guard for checking if a value is a number.
 */
export function isNumber(value: unknown): value is number {
    return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Type guard for checking if a value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}

// =============================================================================
// API Response Type Guards
// =============================================================================

/**
 * Chat message from API response.
 */
export interface ApiMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content?: string;
    parts?: unknown[];
    createdAt?: string | Date;
}

/**
 * Type guard for API message objects.
 */
export function isApiMessage(value: unknown): value is ApiMessage {
    if (!isObject(value)) {
        return false;
    }

    const msg = value as Record<string, unknown>;

    return (
        isString(msg.id) &&
        isString(msg.role) &&
        ["user", "assistant", "system"].includes(msg.role as string)
    );
}

/**
 * Type guard for array of API messages.
 */
export function isApiMessageArray(value: unknown): value is ApiMessage[] {
    return isArray(value) && value.every(isApiMessage);
}

/**
 * Chat object from API response.
 */
export interface ApiChat {
    id: string;
    title?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    userId?: string;
}

/**
 * Type guard for API chat objects.
 */
export function isApiChat(value: unknown): value is ApiChat {
    if (!isObject(value)) {
        return false;
    }

    const chat = value as Record<string, unknown>;
    return isString(chat.id);
}

/**
 * Type guard for array of API chats.
 */
export function isApiChatArray(value: unknown): value is ApiChat[] {
    return isArray(value) && value.every(isApiChat);
}

/**
 * Document object from API response.
 */
export interface ApiDocument {
    id: string;
    title?: string;
    content?: string | null;
    kind?: string;
    createdAt?: string | Date;
}

/**
 * Type guard for API document objects.
 */
export function isApiDocument(value: unknown): value is ApiDocument {
    if (!isObject(value)) {
        return false;
    }

    const doc = value as Record<string, unknown>;
    return isString(doc.id);
}

/**
 * Vote object from API response.
 */
export interface ApiVote {
    messageId: string;
    vote: "up" | "down";
}

/**
 * Type guard for API vote objects.
 */
export function isApiVote(value: unknown): value is ApiVote {
    if (!isObject(value)) {
        return false;
    }

    const vote = value as Record<string, unknown>;
    return (
        isString(vote.messageId) &&
        isString(vote.vote) &&
        ["up", "down"].includes(vote.vote as string)
    );
}

/**
 * Type guard for array of API votes.
 */
export function isApiVoteArray(value: unknown): value is ApiVote[] {
    return isArray(value) && value.every(isApiVote);
}

// =============================================================================
// Paginated Response Guards
// =============================================================================

/**
 * Generic paginated response structure.
 */
export interface PaginatedResponse<T> {
    items?: T[];
    data?: T[];
    hasMore: boolean;
    nextCursor?: string;
}

/**
 * Creates a type guard for paginated responses with a custom item validator.
 */
export function createPaginatedResponseGuard<T>(
    itemGuard: (value: unknown) => value is T
): (value: unknown) => value is PaginatedResponse<T> {
    return (value: unknown): value is PaginatedResponse<T> => {
        if (!isObject(value)) {
            return false;
        }

        const response = value as Record<string, unknown>;

        // Check hasMore is boolean
        if (!isBoolean(response.hasMore)) {
            return false;
        }

        // Check items array if present
        if ("items" in response) {
            if (!isArray(response.items)) {
                return false;
            }
            if (!response.items.every(itemGuard)) {
                return false;
            }
        }

        // Check data array if present (alternative format)
        if ("data" in response) {
            if (!isArray(response.data)) {
                return false;
            }
            if (!response.data.every(itemGuard)) {
                return false;
            }
        }

        // Check optional nextCursor
        if ("nextCursor" in response && response.nextCursor !== undefined) {
            if (!isString(response.nextCursor)) {
                return false;
            }
        }

        return true;
    };
}

// =============================================================================
// Error Response Guards
// =============================================================================

/**
 * API error response structure.
 */
export interface ApiErrorResponse {
    error: string;
    code?: string;
    details?: unknown;
}

/**
 * Type guard for API error responses.
 */
export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
    if (!isObject(value)) {
        return false;
    }

    const response = value as Record<string, unknown>;
    return isString(response.error);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Safely parse JSON with type validation.
 *
 * @param json - JSON string to parse
 * @param guard - Type guard function to validate the parsed result
 * @returns Parsed and validated data, or null if invalid
 */
export function safeJsonParse<T>(
    json: string,
    guard: (value: unknown) => value is T
): T | null {
    try {
        const parsed = JSON.parse(json);
        if (guard(parsed)) {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Assert that a value matches a type guard, throwing if it doesn't.
 *
 * @param value - Value to check
 * @param guard - Type guard function
 * @param errorMessage - Error message if assertion fails
 */
export function assertType<T>(
    value: unknown,
    guard: (value: unknown) => value is T,
    errorMessage = "Type assertion failed"
): asserts value is T {
    if (!guard(value)) {
        throw new TypeError(errorMessage);
    }
}
