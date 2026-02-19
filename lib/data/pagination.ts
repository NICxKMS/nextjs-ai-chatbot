/**
 * Data Layer Cursor Pagination Adapter
 *
 * Compatibility adapter exposing pagination APIs under `lib/data/*`
 * while reusing canonical cursor pagination logic in `lib/db/pagination`.
 *
 * @module lib/data/pagination
 */

import "server-only"

import {
	decodeCursor,
	encodeCursor,
	type PaginationDirection,
	paginate,
} from "@/lib/db/pagination"

/**
 * Contract-compatible cursor pagination params.
 */
export interface CursorPaginationParams {
	/** Opaque cursor string */
	cursor?: string
	/** Max records to return */
	limit: number
	/** Pagination direction */
	direction?: PaginationDirection
}

/**
 * Contract-compatible cursor paginated response.
 */
export interface CursorPaginatedResult<T> {
	/** Page items */
	items: T[]
	/** Cursor for the next page, if available */
	nextCursor: string | null
	/** Whether there are more records available */
	hasMore: boolean
}

/**
 * Apply cursor pagination to a Drizzle dynamic query.
 */
export async function applyCursorPagination<T extends Record<string, unknown>>(
	query: Parameters<typeof paginate>[0],
	table: Parameters<typeof paginate>[1],
	params: CursorPaginationParams,
	options?: {
		sortField?: keyof T & string
		sortOrder?: "asc" | "desc"
	},
): Promise<CursorPaginatedResult<T>> {
	const paginationOptions: Parameters<typeof paginate>[2] = {
		limit: params.limit,
	}

	if (params.cursor !== undefined) {
		paginationOptions.cursor = params.cursor
	}
	if (params.direction !== undefined) {
		paginationOptions.direction = params.direction
	}
	if (options?.sortField !== undefined) {
		paginationOptions.sortField = options.sortField
	}
	if (options?.sortOrder !== undefined) {
		paginationOptions.sortOrder = options.sortOrder
	}

	const result = await paginate(query, table, paginationOptions)

	return {
		items: result.data as T[],
		nextCursor: result.nextCursor,
		hasMore: result.hasMore,
	}
}

/**
 * Build a cursor response from an already-loaded list.
 *
 * Expects `items` to potentially contain one extra record (`limit + 1`) for
 * has-more detection.
 */
export function buildCursorResponse<T extends Record<string, unknown>>(
	items: T[],
	limit: number,
	options?: {
		cursorField?: keyof T & string
	},
): CursorPaginatedResult<T> {
	const hasMore = items.length > limit
	const pageItems = hasMore ? items.slice(0, limit) : items
	const cursorField =
		options?.cursorField ?? ("createdAt" as keyof T & string)

	let nextCursor: string | null = null

	if (hasMore) {
		const lastItem = pageItems[pageItems.length - 1]
		const cursorValue = lastItem?.[cursorField]
		if (cursorValue !== undefined) {
			nextCursor = encodeCursor(cursorField, cursorValue)
		}
	}

	return {
		items: pageItems,
		nextCursor,
		hasMore,
	}
}

export { decodeCursor, encodeCursor }
