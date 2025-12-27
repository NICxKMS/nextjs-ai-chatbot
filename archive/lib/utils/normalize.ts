/**
 * Data Normalization Utilities
 *
 * Provides functions for normalizing API responses and data structures
 * to ensure consistent data handling throughout the application.
 *
 * @module lib/utils/normalize
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Standard API response envelope.
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    meta?: {
        timestamp: number;
        requestId?: string;
    };
}

/**
 * Paginated response structure.
 */
export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
        nextCursor?: string;
        prevCursor?: string;
    };
}

/**
 * Normalized entity with consistent ID and timestamps.
 */
export interface NormalizedEntity {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
}

// =============================================================================
// Response Normalization
// =============================================================================

/**
 * Normalize a successful API response into the standard envelope.
 *
 * @param data - Response data
 * @param meta - Optional metadata
 * @returns Normalized success response
 */
export function normalizeSuccess<T>(
    data: T,
    meta?: Partial<ApiResponse["meta"]>
): ApiResponse<T> {
    return {
        success: true,
        data,
        meta: {
            timestamp: Date.now(),
            ...meta,
        },
    };
}

/**
 * Normalize an error response into the standard envelope.
 *
 * @param code - Error code
 * @param message - User-friendly error message
 * @param details - Optional error details
 * @returns Normalized error response
 */
export function normalizeError(
    code: string,
    message: string,
    details?: Record<string, unknown>
): ApiResponse<never> {
    return {
        success: false,
        error: {
            code,
            message,
            details,
        },
        meta: {
            timestamp: Date.now(),
        },
    };
}

/**
 * Normalize a paginated response.
 *
 * @param items - Array of items
 * @param options - Pagination options
 * @returns Normalized paginated response
 */
export function normalizePaginated<T>(
    items: T[],
    options: {
        page?: number;
        pageSize?: number;
        total?: number;
        cursor?: string;
        hasMore?: boolean;
    }
): PaginatedResponse<T> {
    const {
        page = 1,
        pageSize = 20,
        total = items.length,
        hasMore = false,
        cursor,
    } = options;

    const totalPages = Math.ceil(total / pageSize);

    return {
        items,
        pagination: {
            page,
            pageSize,
            total,
            totalPages,
            hasMore: hasMore || page < totalPages,
            nextCursor: cursor,
        },
    };
}

// =============================================================================
// Date Normalization
// =============================================================================

/**
 * Normalize a date value to a Date object.
 * Handles strings, numbers (timestamps), and Date objects.
 *
 * @param value - Date value in various formats
 * @returns Date object, or undefined if invalid
 */
export function normalizeDate(
    value: string | number | Date | null | undefined
): Date | undefined {
    if (!value) {
        return;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value;
    }

    if (typeof value === "number") {
        // Handle both seconds and milliseconds timestamps
        const timestamp = value < 10_000_000_000 ? value * 1000 : value;
        const date = new Date(timestamp);
        return Number.isNaN(date.getTime()) ? undefined : date;
    }

    if (typeof value === "string") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? undefined : date;
    }

    return;
}

/**
 * Normalize date fields in an object.
 *
 * @param obj - Object with date fields
 * @param fields - Field names to normalize as dates
 * @returns Object with normalized date fields
 */
export function normalizeDateFields<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[]
): T {
    const result = { ...obj };

    for (const field of fields) {
        const value = result[field];
        if (value !== undefined) {
            const normalized = normalizeDate(value as string | number | Date);
            if (normalized) {
                (result as Record<string, unknown>)[field as string] =
                    normalized;
            }
        }
    }

    return result;
}

// =============================================================================
// Entity Normalization
// =============================================================================

/**
 * Normalize an entity with consistent ID and timestamp handling.
 *
 * @param raw - Raw entity data
 * @returns Normalized entity
 */
export function normalizeEntity<T extends Record<string, unknown>>(
    raw: T
): T & NormalizedEntity {
    const id = String(raw.id ?? raw._id ?? "");
    const createdAt =
        normalizeDate(
            (raw.createdAt as string | number | Date | undefined) ??
                (raw.created_at as string | number | Date | undefined) ??
                (raw.timestamp as string | number | Date | undefined)
        ) ?? new Date();
    const updatedAt = normalizeDate(
        (raw.updatedAt as string | number | Date | undefined) ??
            (raw.updated_at as string | number | Date | undefined)
    );

    return {
        ...raw,
        id,
        createdAt,
        updatedAt,
    };
}

/**
 * Normalize an array of entities.
 *
 * @param items - Array of raw entities
 * @returns Array of normalized entities
 */
export function normalizeEntities<T extends Record<string, unknown>>(
    items: T[]
): Array<T & NormalizedEntity> {
    return items.map(normalizeEntity);
}

// =============================================================================
// String Normalization
// =============================================================================

/**
 * Normalize a string to a consistent format.
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Removes null bytes
 *
 * @param value - String to normalize
 * @returns Normalized string
 */
export function normalizeString(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().replace(/\s+/g, " ").replace(/\0/g, "");
}

/**
 * Normalize an optional string field.
 * Returns undefined for empty/whitespace-only strings.
 *
 * @param value - String to normalize
 * @returns Normalized string or undefined
 */
export function normalizeOptionalString(value: unknown): string | undefined {
    const normalized = normalizeString(value);
    return normalized.length > 0 ? normalized : undefined;
}

// =============================================================================
// Chat History Normalization
// =============================================================================

/**
 * Normalized chat history item.
 */
export interface NormalizedChatItem {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt?: Date;
    visibility: "public" | "private";
    messageCount?: number;
}

/**
 * Normalize a chat history item from various API formats.
 *
 * @param raw - Raw chat item from API
 * @returns Normalized chat item
 */
export function normalizeChatItem(
    raw: Record<string, unknown>
): NormalizedChatItem {
    return {
        id: String(raw.id ?? ""),
        title: normalizeString(raw.title) || "Untitled Chat",
        createdAt:
            normalizeDate(
                (raw.createdAt as string | number | Date | undefined) ??
                    (raw.created_at as string | number | Date | undefined)
            ) ?? new Date(),
        updatedAt: normalizeDate(
            (raw.updatedAt as string | number | Date | undefined) ??
                (raw.updated_at as string | number | Date | undefined)
        ),
        visibility: raw.visibility === "public" ? "public" : "private",
        messageCount:
            typeof raw.messageCount === "number" ? raw.messageCount : undefined,
    };
}

// =============================================================================
// Message Normalization
// =============================================================================

/**
 * Normalized message part.
 */
export interface NormalizedMessagePart {
    type: "text" | "file" | "tool-call" | "tool-result" | "reasoning";
    text?: string;
    url?: string;
    name?: string;
    mediaType?: string;
    toolCallId?: string;
    toolName?: string;
    args?: Record<string, unknown>;
    result?: unknown;
}

/**
 * Normalized chat message.
 */
export interface NormalizedMessage {
    id: string;
    role: "user" | "assistant" | "system";
    parts: NormalizedMessagePart[];
    createdAt: Date;
}

/**
 * Normalize a message part from various formats.
 *
 * @param raw - Raw message part
 * @returns Normalized message part
 */
export function normalizeMessagePart(
    raw: Record<string, unknown>
): NormalizedMessagePart {
    const type = String(raw.type ?? "text") as NormalizedMessagePart["type"];

    const base: NormalizedMessagePart = { type };

    if (type === "text" && raw.text) {
        base.text = normalizeString(raw.text);
    }

    if (type === "file") {
        base.url = normalizeString(raw.url);
        base.name = normalizeOptionalString(raw.name);
        base.mediaType = normalizeOptionalString(
            raw.mediaType ?? raw.contentType
        );
    }

    if (type === "tool-call") {
        base.toolCallId = normalizeString(raw.toolCallId);
        base.toolName = normalizeString(raw.toolName);
        base.args = raw.args as Record<string, unknown> | undefined;
    }

    if (type === "tool-result") {
        base.toolCallId = normalizeString(raw.toolCallId);
        base.result = raw.result;
    }

    if (type === "reasoning" && raw.text) {
        base.text = normalizeString(raw.text);
    }

    return base;
}

/**
 * Normalize a chat message from various API formats.
 *
 * @param raw - Raw message from API
 * @returns Normalized message
 */
export function normalizeMessage(
    raw: Record<string, unknown>
): NormalizedMessage {
    const parts = Array.isArray(raw.parts)
        ? raw.parts.map((p) =>
              normalizeMessagePart(p as Record<string, unknown>)
          )
        : typeof raw.content === "string"
          ? [{ type: "text" as const, text: normalizeString(raw.content) }]
          : [];

    return {
        id: String(raw.id ?? ""),
        role: (raw.role as NormalizedMessage["role"]) ?? "user",
        parts,
        createdAt:
            normalizeDate(
                raw.createdAt as string | number | Date | undefined
            ) ?? new Date(),
    };
}
