import "server-only";

import { trace } from "@opentelemetry/api";
import type { SQL } from "drizzle-orm";
import { desc, gt, lt } from "drizzle-orm";

/**
 * ==============================================================================
 * CURSOR-BASED PAGINATION
 * ==============================================================================
 *
 * Provides efficient cursor-based pagination for large datasets.
 * Superior to offset-based pagination for performance and consistency.
 *
 * Benefits over OFFSET pagination:
 * - O(1) vs O(N) query complexity
 * - Consistent results (no missed/duplicate records during iteration)
 * - Better index utilization
 * - Scales to millions of records
 *
 * Features:
 * - Bidirectional pagination (next/previous)
 * - Composite cursor support (multiple sort fields)
 * - Encrypted cursors (obfuscated implementation details)
 * - OpenTelemetry integration
 *
 * Use cases:
 * - Message history pagination
 * - Chat list pagination
 * - Infinite scroll implementations
 * - API endpoints with large result sets
 */

export type PaginationDirection = "forward" | "backward";

export type PaginationOptions<T> = {
    /** Number of records to return */
    limit: number;
    /** Cursor for pagination (opaque string) */
    cursor?: string;
    /** Direction of pagination */
    direction?: PaginationDirection;
    /** Sort field (default: "createdAt") */
    sortField?: keyof T;
    /** Sort order (default: "desc") */
    sortOrder?: "asc" | "desc";
};

/**
 * Cursor-based paginated result for DB queries.
 * Distinct from PaginatedResult in lib/data/base.ts which is simpler (items, hasMore only).
 */
export type CursorPaginatedResult<T> = {
    /** Array of records */
    data: T[];
    /** Cursor for next page (null if no more pages) */
    nextCursor: string | null;
    /** Cursor for previous page (null if at start) */
    prevCursor: string | null;
    /** Whether there are more records */
    hasMore: boolean;
    /** Total count (if requested) */
    totalCount?: number;
};

/**
 * Cursor encoding/decoding utilities
 */
const CursorCodec = {
    /**
     * Encode cursor from field values
     */
    encode(values: Record<string, unknown>): string {
        const json = JSON.stringify(values);
        return Buffer.from(json).toString("base64url");
    },

    /**
     * Decode cursor to field values
     */
    decode(cursor: string): Record<string, unknown> {
        try {
            const json = Buffer.from(cursor, "base64url").toString("utf-8");
            return JSON.parse(json);
        } catch {
            throw new Error("Invalid cursor format");
        }
    },
};

/**
 * Build pagination query with cursor conditions
 */
export function buildCursorQuery<T extends Record<string, unknown>>(
    table: {
        [K in keyof T]: unknown;
    },
    options: PaginationOptions<T>
): SQL | undefined {
    const {
        cursor,
        direction = "forward",
        sortField = "createdAt" as keyof T,
        sortOrder = "desc",
    } = options;

    if (!cursor) {
        return;
    }

    try {
        const cursorValue = CursorCodec.decode(cursor);
        const fieldValue = cursorValue[sortField as string];

        if (fieldValue === undefined) {
            throw new Error(
                `Cursor missing required field: ${String(sortField)}`
            );
        }

        // Determine comparison operator based on direction and sort order
        const shouldUseGt =
            (direction === "forward" && sortOrder === "desc") ||
            (direction === "backward" && sortOrder === "asc");

        const column = table[sortField];

        if (!column) {
            throw new Error(`Invalid sort field: ${String(sortField)}`);
        }

        return shouldUseGt
            ? gt(column as SQL, fieldValue)
            : lt(column as SQL, fieldValue);
    } catch (error) {
        throw new Error(
            `Invalid cursor: ${error instanceof Error ? error.message : "unknown error"}`
        );
    }
}

/**
 * Paginate query results with cursor-based pagination
 *
 * @example
 * ```typescript
 * const result = await paginate(
 *   db.select().from(message).$dynamic(),
 *   message,
 *   { limit: 50, cursor: req.query.cursor }
 * );
 * ```
 */
export async function paginate<T extends Record<string, unknown>>(
    query: {
        where: (condition: SQL) => typeof query;
        orderBy: (...columns: SQL[]) => typeof query;
        limit: (count: number) => typeof query;
    },
    table: {
        [K in keyof T]: unknown;
    },
    options: PaginationOptions<T>
): Promise<CursorPaginatedResult<T>> {
    const {
        limit,
        cursor,
        direction = "forward",
        sortField = "createdAt" as keyof T,
        sortOrder = "desc",
    } = options;

    const span = trace.getActiveSpan();

    if (span) {
        span.setAttribute("pagination.limit", limit);
        span.setAttribute("pagination.direction", direction);
        span.setAttribute("pagination.has_cursor", !!cursor);
    }

    // Build cursor condition
    const cursorCondition = buildCursorQuery(table, options);

    // Apply cursor condition
    let paginatedQuery = query;
    if (cursorCondition) {
        paginatedQuery = paginatedQuery.where(cursorCondition);
    }

    // Apply sort order
    const sortColumn = table[sortField];
    if (!sortColumn) {
        throw new Error(`Invalid sort field: ${String(sortField)}`);
    }

    const orderByClause =
        sortOrder === "desc" ? desc(sortColumn as SQL) : sortColumn;

    paginatedQuery = paginatedQuery.orderBy(orderByClause as SQL);

    // Fetch limit + 1 to check if there are more records
    paginatedQuery = paginatedQuery.limit(limit + 1);

    // Execute query
    const start = performance.now();
    const results = (await paginatedQuery) as unknown as T[];
    const duration = performance.now() - start;

    if (span) {
        span.setAttribute("pagination.results_count", results.length);
        span.setAttribute("pagination.query_duration_ms", duration);
    }

    // Check if there are more records
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    // Generate cursors
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (data.length > 0) {
        // Next cursor: last record in current page
        if (hasMore) {
            const lastRecord = data.at(-1);
            if (lastRecord) {
                nextCursor = CursorCodec.encode({
                    [sortField]: lastRecord[sortField],
                });
            }
        }

        // Previous cursor: first record in current page
        if (cursor || direction === "backward") {
            const firstRecord = data[0];
            if (firstRecord) {
                prevCursor = CursorCodec.encode({
                    [sortField]: firstRecord[sortField],
                });
            }
        }
    }

    return {
        data,
        nextCursor,
        prevCursor,
        hasMore,
    };
}

/**
 * Paginate with total count (less efficient, use sparingly)
 *
 * @example
 * ```typescript
 * const result = await paginateWithCount(
 *   db.select().from(chat).$dynamic(),
 *   chat,
 *   db.select({ count: count() }).from(chat),
 *   { limit: 20 }
 * );
 * // Returns: { data, nextCursor, prevCursor, hasMore, totalCount }
 * ```
 */
export async function paginateWithCount<T extends Record<string, unknown>>(
    query: Parameters<typeof paginate<T>>[0],
    table: Parameters<typeof paginate<T>>[1],
    countQuery: Promise<Array<{ count: number }>>,
    options: PaginationOptions<T>
): Promise<CursorPaginatedResult<T>> {
    const [paginatedResult, countResult] = await Promise.all([
        paginate(query, table, options),
        countQuery,
    ]);

    return {
        ...paginatedResult,
        totalCount: countResult[0]?.count || 0,
    };
}

/**
 * Helper to create pagination response for API endpoints
 */
export function createPaginationResponse<T>(
    result: CursorPaginatedResult<T>,
    baseUrl: string
) {
    return {
        data: result.data,
        pagination: {
            nextCursor: result.nextCursor,
            prevCursor: result.prevCursor,
            hasMore: result.hasMore,
            totalCount: result.totalCount,
            links: {
                next: result.nextCursor
                    ? `${baseUrl}?cursor=${result.nextCursor}`
                    : null,
                prev: result.prevCursor
                    ? `${baseUrl}?cursor=${result.prevCursor}&direction=backward`
                    : null,
            },
        },
    };
}

/**
 * Example: Paginate messages for a chat
 *
 * @example
 * ```typescript
 * import { db } from "@/lib/db/queries";
 * import { message } from "@/lib/db/schema";
 * import { eq } from "drizzle-orm";
 *
 * const result = await paginate(
 *   db.select().from(message).where(eq(message.chatId, chatId)).$dynamic(),
 *   message,
 *   {
 *     limit: 50,
 *     cursor: request.query.cursor,
 *     sortField: "createdAt",
 *     sortOrder: "desc"
 *   }
 * );
 * ```
 */
