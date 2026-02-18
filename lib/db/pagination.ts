/**
 * Cursor-Based Pagination Utilities
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
 * - Encoded cursors (obfuscated implementation details)
 * - OpenTelemetry integration
 * - Type-safe generic implementation
 *
 * @module lib/db/pagination
 */

import { trace } from "@opentelemetry/api"
import type { SQL } from "drizzle-orm"
import { asc, desc, gt, lt } from "drizzle-orm"
import type { PaginatedResult, PaginationParams } from "@/lib/data/types"

// =============================================================================
// Types
// =============================================================================

/**
 * Direction of pagination for cursor-based queries.
 */
export type PaginationDirection = "forward" | "backward"

/**
 * Extended pagination options for building cursor queries.
 */
export interface CursorPaginationOptions<T> {
	/** Number of records to return */
	limit: number
	/** Cursor for pagination (opaque base64url encoded string) */
	cursor?: string
	/** Direction of pagination (default: "forward") */
	direction?: PaginationDirection
	/** Sort field name (default: "createdAt") */
	sortField?: keyof T & string
	/** Sort order (default: "desc") */
	sortOrder?: "asc" | "desc"
}

/**
 * Extended paginated result with cursor information.
 * Provides both next and previous cursors for bidirectional pagination.
 */
export interface CursorPaginatedResult<T> {
	/** Array of records for the current page */
	data: T[]
	/** Cursor for next page (null if no more pages) */
	nextCursor: string | null
	/** Cursor for previous page (null if at start) */
	prevCursor: string | null
	/** Whether there are more records in the forward direction */
	hasMore: boolean
	/** Total count (optional, requires separate count query) */
	totalCount?: number
}

/**
 * Cursor value structure after decoding.
 */
interface CursorValue {
	/** The field value used as cursor */
	[key: string]: unknown
}

// =============================================================================
// Cursor Codec
// =============================================================================

/**
 * Cursor encoding/decoding utilities for obfuscating pagination implementation.
 * Uses base64url encoding for URL-safe cursors.
 */
const CursorCodec = {
	/**
	 * Encode cursor from field values.
	 * @param values - Object containing field values to encode
	 * @returns Base64url encoded cursor string
	 */
	encode(values: CursorValue): string {
		const json = JSON.stringify(values)
		return Buffer.from(json).toString("base64url")
	},

	/**
	 * Decode cursor to field values.
	 * @param cursor - Base64url encoded cursor string
	 * @returns Decoded cursor values
	 * @throws Error if cursor format is invalid
	 */
	decode(cursor: string): CursorValue {
		try {
			const json = Buffer.from(cursor, "base64url").toString("utf-8")
			return JSON.parse(json) as CursorValue
		} catch {
			throw new Error("Invalid cursor format")
		}
	},
}

// =============================================================================
// Cursor Query Builder
// =============================================================================

/**
 * Build a cursor condition for pagination queries.
 *
 * Creates the appropriate SQL condition based on pagination direction and sort order.
 * Used internally by the paginate function.
 *
 * @param table - Drizzle table schema object
 * @param options - Pagination options including cursor, direction, and sort settings
 * @returns SQL condition for cursor-based filtering, or undefined if no cursor
 *
 * @example
 * ```typescript
 * const condition = buildCursorCondition(chat, {
 *   cursor: "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxIn0=",
 *   direction: "forward",
 *   sortField: "createdAt",
 *   sortOrder: "desc"
 * });
 * // Returns: lt(chat.createdAt, new Date("2024-01-01"))
 * ```
 */
export function buildCursorCondition<T extends Record<string, unknown>>(
	table: Record<string, unknown>,
	options: CursorPaginationOptions<T>,
): SQL | undefined {
	const {
		cursor,
		direction = "forward",
		sortField = "createdAt" as keyof T & string,
		sortOrder = "desc",
	} = options

	if (!cursor) {
		return undefined
	}

	try {
		const cursorValue = CursorCodec.decode(cursor)
		const fieldValue = cursorValue[sortField]

		if (fieldValue === undefined) {
			throw new Error(`Cursor missing required field: ${sortField}`)
		}

		// Determine comparison operator based on direction and sort order
		// Forward + desc: use lt (get items with createdAt < cursor)
		// Forward + asc: use gt (get items with createdAt > cursor)
		// Backward + desc: use gt (get items with createdAt > cursor)
		// Backward + asc: use lt (get items with createdAt < cursor)
		const shouldUseGt =
			(direction === "forward" && sortOrder === "asc") ||
			(direction === "backward" && sortOrder === "desc")

		const column = table[sortField]

		if (!column) {
			throw new Error(`Invalid sort field: ${sortField}`)
		}

		return shouldUseGt
			? gt(column as SQL, fieldValue)
			: lt(column as SQL, fieldValue)
	} catch (error) {
		throw new Error(
			`Invalid cursor: ${error instanceof Error ? error.message : "unknown error"}`,
		)
	}
}

// =============================================================================
// Main Pagination Function
// =============================================================================

/**
 * Paginate query results with cursor-based pagination.
 *
 * This is a generic pagination utility that works with any Drizzle query.
 * It handles cursor encoding/decoding, bidirectional pagination, and hasMore detection.
 *
 * @param query - Drizzle query builder with where, orderBy, and limit methods
 * @param table - Drizzle table schema for column references
 * @param options - Pagination options
 * @returns Paginated result with data, cursors, and hasMore flag
 *
 * @example
 * ```typescript
 * import { db } from "@/lib/db/client";
 * import { chat } from "@/lib/db/schema";
 * import { eq } from "drizzle-orm";
 *
 * const result = await paginate(
 *   db.select().from(chat).where(eq(chat.userId, userId)).$dynamic(),
 *   chat,
 *   { limit: 20, cursor: request.query.cursor }
 * );
 *
 * // Result: { data: [...chats], nextCursor: "...", prevCursor: "...", hasMore: true }
 * ```
 */
export async function paginate<T extends Record<string, unknown>>(
	query: {
		where: (condition: SQL) => typeof query
		orderBy: (...columns: SQL[]) => typeof query
		limit: (count: number) => typeof query
	},
	table: Record<string, unknown>,
	options: CursorPaginationOptions<T>,
): Promise<CursorPaginatedResult<T>> {
	const {
		limit,
		cursor,
		direction = "forward",
		sortField = "createdAt" as keyof T & string,
		sortOrder = "desc",
	} = options

	const span = trace.getActiveSpan()

	if (span) {
		span.setAttribute("pagination.limit", limit)
		span.setAttribute("pagination.direction", direction)
		span.setAttribute("pagination.has_cursor", !!cursor)
		span.setAttribute("pagination.sort_field", sortField)
		span.setAttribute("pagination.sort_order", sortOrder)
	}

	// Build cursor condition
	const cursorCondition = buildCursorCondition(table, options)

	// Apply cursor condition
	let paginatedQuery = query
	if (cursorCondition) {
		paginatedQuery = paginatedQuery.where(cursorCondition)
	}

	// Apply sort order
	const sortColumn = table[sortField]
	if (!sortColumn) {
		throw new Error(`Invalid sort field: ${sortField}`)
	}

	// For backward pagination, reverse the sort order
	const effectiveSortOrder =
		direction === "backward"
			? sortOrder === "desc"
				? "asc"
				: "desc"
			: sortOrder

	const orderByClause =
		effectiveSortOrder === "desc"
			? desc(sortColumn as SQL)
			: asc(sortColumn as SQL)

	paginatedQuery = paginatedQuery.orderBy(orderByClause as SQL)

	// Fetch limit + 1 to check if there are more records
	paginatedQuery = paginatedQuery.limit(limit + 1)

	// Execute query
	const start = performance.now()
	const results = (await paginatedQuery) as unknown as T[]
	const duration = performance.now() - start

	if (span) {
		span.setAttribute("pagination.results_count", results.length)
		span.setAttribute("pagination.query_duration_ms", duration)
	}

	// Check if there are more records
	const hasMore = results.length > limit
	const data = hasMore ? results.slice(0, limit) : results

	// Reverse results if we were paginating backward
	if (direction === "backward") {
		data.reverse()
	}

	// Generate cursors
	let nextCursor: string | null = null
	let prevCursor: string | null = null

	if (data.length > 0) {
		// Next cursor: last record in current page
		if (hasMore || direction === "backward") {
			const lastRecord = data.at(-1)
			if (lastRecord) {
				const lastValue = lastRecord[sortField]
				if (lastValue !== undefined) {
					nextCursor = CursorCodec.encode({
						[sortField]: lastValue,
					})
				}
			}
		}

		// Previous cursor: first record in current page
		if (cursor || direction === "backward") {
			const firstRecord = data[0]
			if (firstRecord) {
				const firstValue = firstRecord[sortField]
				if (firstValue !== undefined) {
					prevCursor = CursorCodec.encode({
						[sortField]: firstValue,
					})
				}
			}
		}
	}

	return {
		data,
		nextCursor,
		prevCursor,
		hasMore,
	}
}

/**
 * Paginate with total count (less efficient, use sparingly).
 *
 * Performs an additional count query to get total records.
 * Only use when total count is absolutely necessary for UI.
 *
 * @param query - Drizzle query builder
 * @param table - Drizzle table schema
 * @param countQuery - Pre-built count query promise
 * @param options - Pagination options
 * @returns Paginated result with total count
 *
 * @example
 * ```typescript
 * const result = await paginateWithCount(
 *   db.select().from(chat).where(eq(chat.userId, userId)).$dynamic(),
 *   chat,
 *   db.select({ count: count() }).from(chat).where(eq(chat.userId, userId)),
 *   { limit: 20 }
 * );
 * // Returns: { data, nextCursor, prevCursor, hasMore, totalCount: 100 }
 * ```
 */
export async function paginateWithCount<T extends Record<string, unknown>>(
	query: Parameters<typeof paginate<T>>[0],
	table: Parameters<typeof paginate<T>>[1],
	countQuery: Promise<Array<{ count: number }>>,
	options: CursorPaginationOptions<T>,
): Promise<CursorPaginatedResult<T>> {
	const [paginatedResult, countResult] = await Promise.all([
		paginate(query, table, options),
		countQuery,
	])

	return {
		...paginatedResult,
		totalCount: countResult[0]?.count || 0,
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a pagination response for API endpoints.
 *
 * Transforms a CursorPaginatedResult into a standardized API response format
 * with HATEOAS-style links for pagination.
 *
 * @param result - Paginated result from paginate()
 * @param baseUrl - Base URL for constructing pagination links
 * @returns API response with data and pagination metadata
 *
 * @example
 * ```typescript
 * const result = await paginate(query, chat, { limit: 20 });
 * const response = createPaginationResponse(result, "/api/chats");
 * // {
 * //   data: [...chats],
 * //   pagination: {
 * //     nextCursor: "...",
 * //     prevCursor: "...",
 * //     hasMore: true,
 * //     links: { next: "/api/chats?cursor=...", prev: "/api/chats?cursor=...&direction=backward" }
 * //   }
 * // }
 * ```
 */
export function createPaginationResponse<T>(
	result: CursorPaginatedResult<T>,
	baseUrl: string,
): {
	data: T[]
	pagination: {
		nextCursor: string | null
		prevCursor: string | null
		hasMore: boolean
		totalCount?: number
		links: {
			next: string | null
			prev: string | null
		}
	}
} {
	const pagination: {
		nextCursor: string | null
		prevCursor: string | null
		hasMore: boolean
		totalCount?: number
		links: {
			next: string | null
			prev: string | null
		}
	} = {
		nextCursor: result.nextCursor,
		prevCursor: result.prevCursor,
		hasMore: result.hasMore,
		links: {
			next: result.nextCursor
				? `${baseUrl}?cursor=${result.nextCursor}`
				: null,
			prev: result.prevCursor
				? `${baseUrl}?cursor=${result.prevCursor}&direction=backward`
				: null,
		},
	}

	if (result.totalCount !== undefined) {
		pagination.totalCount = result.totalCount
	}

	return {
		data: result.data,
		pagination,
	}
}

/**
 * Convert PaginationParams (from repositories) to CursorPaginationOptions.
 *
 * This helper bridges the gap between the simple PaginationParams interface
 * used by repositories and the more feature-rich CursorPaginationOptions.
 *
 * @param params - Simple pagination params with startingAfter/endingBefore
 * @param options - Additional cursor pagination options
 * @returns CursorPaginationOptions for use with paginate()
 */
export function toCursorOptions<T>(
	params: PaginationParams,
	options: {
		sortField?: keyof T & string
		sortOrder?: "asc" | "desc"
	} = {},
): CursorPaginationOptions<T> {
	const cursor = params.startingAfter ?? params.endingBefore
	const result: CursorPaginationOptions<T> = {
		limit: params.limit,
		direction: params.endingBefore ? "backward" : "forward",
	}

	if (cursor) {
		result.cursor = cursor
	}
	if (options.sortField) {
		result.sortField = options.sortField
	}
	if (options.sortOrder) {
		result.sortOrder = options.sortOrder
	}

	return result
}

/**
 * Convert CursorPaginatedResult to simple PaginatedResult.
 *
 * This helper converts the richer cursor result to the simpler format
 * expected by repository methods.
 *
 * @param result - Cursor paginated result
 * @returns Simple paginated result with items and hasMore
 */
export function toPaginatedResult<T>(
	result: CursorPaginatedResult<T>,
): PaginatedResult<T> {
	return {
		items: result.data,
		hasMore: result.hasMore,
	}
}

/**
 * Encode a cursor from a field value.
 *
 * Utility for creating cursors manually when needed.
 *
 * @param field - Field name
 * @param value - Field value
 * @returns Encoded cursor string
 */
export function encodeCursor(field: string, value: unknown): string {
	return CursorCodec.encode({ [field]: value })
}

/**
 * Decode a cursor to get the field value.
 *
 * Utility for inspecting cursor contents when debugging.
 *
 * @param cursor - Encoded cursor string
 * @param field - Field name to extract
 * @returns Decoded field value or undefined
 */
export function decodeCursor(
	cursor: string,
	field: string,
): unknown | undefined {
	const values = CursorCodec.decode(cursor)
	return values[field]
}
