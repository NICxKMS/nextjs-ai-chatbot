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
 *
 * This guard ensures the value is:
 * - Not null
 * - Not an array (arrays are objects in JavaScript)
 * - A plain object type
 *
 * @param value - The unknown value to check
 * @returns `true` if value is a non-null, non-array object; narrows type to `Record<string, unknown>`
 *
 * @example
 * ```ts
 * const data: unknown = { name: 'test' };
 * if (isObject(data)) {
 *   console.log(data.name); // TypeScript knows data is Record<string, unknown>
 * }
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is an array.
 *
 * Uses JavaScript's native `Array.isArray()` for reliable detection.
 *
 * @param value - The unknown value to check
 * @returns `true` if value is an array; narrows type to `unknown[]`
 *
 * @example
 * ```ts
 * const data: unknown = [1, 2, 3];
 * if (isArray(data)) {
 *   data.forEach(item => console.log(item)); // TypeScript knows data is unknown[]
 * }
 * ```
 */
export function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

/**
 * Type guard for checking if a value is a string.
 *
 * Checks using `typeof` operator for primitive string detection.
 * Note: Does not match String objects created via `new String()`.
 *
 * @param value - The unknown value to check
 * @returns `true` if value is a primitive string; narrows type to `string`
 *
 * @example
 * ```ts
 * const data: unknown = 'hello';
 * if (isString(data)) {
 *   console.log(data.toUpperCase()); // TypeScript knows data is string
 * }
 * ```
 */
export function isString(value: unknown): value is string {
    return typeof value === "string";
}

/**
 * Type guard for checking if a value is a number.
 *
 * Checks using `typeof` and excludes NaN values since NaN is technically
 * a number type but usually indicates invalid data.
 *
 * @param value - The unknown value to check
 * @returns `true` if value is a finite number (excluding NaN); narrows type to `number`
 *
 * @example
 * ```ts
 * const data: unknown = 42;
 * if (isNumber(data)) {
 *   console.log(data * 2); // TypeScript knows data is number
 * }
 *
 * isNumber(NaN);       // false
 * isNumber(Infinity);  // true (use Number.isFinite for stricter check)
 * ```
 */
export function isNumber(value: unknown): value is number {
    return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Type guard for checking if a value is a boolean.
 *
 * Checks for primitive boolean values (`true` or `false`).
 * Note: Does not match Boolean objects created via `new Boolean()`.
 *
 * @param value - The unknown value to check
 * @returns `true` if value is a primitive boolean; narrows type to `boolean`
 *
 * @example
 * ```ts
 * const data: unknown = true;
 * if (isBoolean(data)) {
 *   const result = data ? 'yes' : 'no'; // TypeScript knows data is boolean
 * }
 * ```
 */
export function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}

// =============================================================================
// API Response Type Guards
// =============================================================================

/** Valid message roles for chat messages */
const VALID_MESSAGE_ROLES = ["user", "assistant", "system"] as const;

/**
 * Chat message from API response.
 */
export interface ApiMessage {
    id: string;
    role: (typeof VALID_MESSAGE_ROLES)[number];
    content?: string;
    parts?: unknown[];
    createdAt?: string | Date;
}

/**
 * Type guard for API message objects.
 *
 * Validates that a value conforms to the `ApiMessage` interface structure.
 * Checks for required `id` (string) and `role` (valid message role) properties.
 *
 * @param value - The unknown value to validate
 * @returns `true` if value is a valid ApiMessage; narrows type to `ApiMessage`
 *
 * @example
 * ```ts
 * const data: unknown = await fetchMessage();
 * if (isApiMessage(data)) {
 *   console.log(data.id, data.role); // Safe access to ApiMessage properties
 * }
 * ```
 *
 * @see {@link ApiMessage} for the validated interface structure
 */
export function isApiMessage(value: unknown): value is ApiMessage {
    if (!isObject(value)) {
        return false;
    }

    const msg = value as Record<string, unknown>;

    return (
        isString(msg.id) &&
        isString(msg.role) &&
        VALID_MESSAGE_ROLES.includes(
            msg.role as (typeof VALID_MESSAGE_ROLES)[number]
        )
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
 *
 * Validates that a value conforms to the `ApiChat` interface structure.
 * Checks for required `id` (string) property. Optional fields (title, createdAt,
 * updatedAt, userId) are not validated but available on the narrowed type.
 *
 * @param value - The unknown value to validate
 * @returns `true` if value is a valid ApiChat; narrows type to `ApiChat`
 *
 * @example
 * ```ts
 * const data: unknown = await fetchChat();
 * if (isApiChat(data)) {
 *   console.log(data.id, data.title); // Safe access to ApiChat properties
 * }
 * ```
 *
 * @see {@link ApiChat} for the validated interface structure
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
 *
 * Validates that a value conforms to the `ApiDocument` interface structure.
 * Checks for required `id` (string) property. Optional fields (title, content,
 * kind, createdAt) are not validated but available on the narrowed type.
 *
 * @param value - The unknown value to validate
 * @returns `true` if value is a valid ApiDocument; narrows type to `ApiDocument`
 *
 * @example
 * ```ts
 * const data: unknown = await fetchDocument();
 * if (isApiDocument(data)) {
 *   console.log(data.id, data.title); // Safe access to ApiDocument properties
 * }
 * ```
 *
 * @see {@link ApiDocument} for the validated interface structure
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
 *
 * Validates that a value conforms to the `ApiVote` interface structure.
 * Checks for required `messageId` (string) and `vote` ('up' | 'down') properties.
 *
 * @param value - The unknown value to validate
 * @returns `true` if value is a valid ApiVote; narrows type to `ApiVote`
 *
 * @example
 * ```ts
 * const data: unknown = await submitVote();
 * if (isApiVote(data)) {
 *   console.log(`Vote ${data.vote} on message ${data.messageId}`);
 * }
 * ```
 *
 * @see {@link ApiVote} for the validated interface structure
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
        if (
            "nextCursor" in response &&
            response.nextCursor !== undefined &&
            !isString(response.nextCursor)
        ) {
            return false;
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
