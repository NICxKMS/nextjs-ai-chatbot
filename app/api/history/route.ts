/**
 * Chat History API Route
 *
 * Lists user's chat history with cursor-based pagination. Delegates to feature actions.
 * Rate limited to prevent abuse.
 *
 * Query Parameters:
 * - cursor: (optional) Pagination cursor (chat ID)
 * - starting_after: (optional) Legacy alias for forward cursor (chat ID)
 * - ending_before: (optional) Legacy alias for backward cursor (chat ID)
 * - limit: (optional) Number of chats to return (1-100, default 20)
 * - direction: (optional) 'forward' | 'backward' (default: 'forward')
 * - q: (optional) Search query for title filtering (case-insensitive)
 * - from: (optional) Date filter - include chats from this date onwards (ISO date string)
 * - to: (optional) Date filter - include chats up to this date (ISO date string)
 *
 * Response:
 * ```json
 * {
 *   "success": true,
 *   "data": [...chats],
 *   "pagination": {
 *     "nextCursor": "string | null",
 *     "prevCursor": "string | null",
 *     "hasMore": boolean,
 *     "links": { "next": "...", "prev": "..." }
 *   }
 * }
 * ```
 *
 * @module app/api/history/route
 */

import { and, desc, eq, gte, ilike, lte, type SQL } from "drizzle-orm"
import { z } from "zod"
import { deleteAllChatsAction } from "@/features/chat/actions"
import { error, isValidUUID, rateLimit, success } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"
import {
	applyCursorPagination,
	type CursorPaginationParams,
	decodeCursor,
	encodeCursor,
} from "@/lib/data"
import { chat, db } from "@/lib/db"
import {
	type CursorPaginatedResult,
	createPaginationResponse,
} from "@/lib/db/pagination"
import type { Chat } from "@/lib/db/schema"
import { ValidationError } from "@/lib/errors"
import {
	checkApiLimit,
	checkStrictLimit,
	createRateLimitHeaders,
	getRetryAfter,
} from "@/lib/rate-limit"

// =============================================================================
// Query Parameter Validation
// =============================================================================

/**
 * Zod schema for history query parameters
 */
const historyQuerySchema = z.object({
	cursor: z.string().min(1).optional(),
	starting_after: z.string().uuid().optional(),
	ending_before: z.string().uuid().optional(),
	offset: z.coerce.number().int().min(0).max(10_000).optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	direction: z.enum(["forward", "backward"]).default("forward"),
	q: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
})

type HistoryDirection = "forward" | "backward"

interface HistoryCursorAdapterInput
	extends Pick<CursorPaginationParams, "cursor" | "direction" | "limit"> {
	startingAfter?: string
	endingBefore?: string
	offset?: number
}

interface HistoryCursorAdapterResult {
	direction: HistoryDirection
	startingAfter: string | null
	endingBefore: string | null
	offset: number | null
}

function resolveCursorId(cursor: string): string {
	if (isValidUUID(cursor)) {
		return cursor
	}

	const decodedCursor = decodeCursor(cursor, "id")
	if (typeof decodedCursor === "string" && isValidUUID(decodedCursor)) {
		return decodedCursor
	}

	throw new ValidationError(
		"Invalid cursor format. Expected a chat ID cursor.",
		{
			field: "cursor",
		},
	)
}

async function resolveCursorToUpdatedAtCursor(
	userId: string,
	cursorId: string,
): Promise<string> {
	const [cursorRow] = await db
		.select({ updatedAt: chat.updatedAt })
		.from(chat)
		.where(and(eq(chat.id, cursorId), eq(chat.userId, userId)))
		.limit(1)

	if (!cursorRow) {
		throw new ValidationError("Cursor chat not found", {
			field: "cursor",
		})
	}

	return encodeCursor("updatedAt", cursorRow.updatedAt.toISOString())
}

function applyHistoryCursorAdapter(
	input: HistoryCursorAdapterInput,
): HistoryCursorAdapterResult {
	const {
		cursor,
		direction = "forward",
		startingAfter,
		endingBefore,
		offset,
	} = input

	if (startingAfter && endingBefore) {
		throw new ValidationError(
			"Only one of starting_after or ending_before can be provided.",
			{
				field: "starting_after",
			},
		)
	}

	if (cursor && (startingAfter || endingBefore)) {
		throw new ValidationError(
			"Use either cursor-based pagination or starting_after/ending_before aliases, not both.",
			{
				field: "cursor",
			},
		)
	}

	if (offset !== undefined) {
		if (cursor || startingAfter || endingBefore) {
			throw new ValidationError(
				"Use either offset pagination or cursor pagination, not both.",
				{
					field: "offset",
				},
			)
		}

		if (direction === "backward") {
			throw new ValidationError(
				"Offset pagination only supports forward direction.",
				{
					field: "direction",
				},
			)
		}

		return {
			direction: "forward",
			startingAfter: null,
			endingBefore: null,
			offset,
		}
	}

	if (endingBefore) {
		return {
			direction: "backward",
			startingAfter: null,
			endingBefore,
			offset: null,
		}
	}

	if (startingAfter) {
		return {
			direction: "forward",
			startingAfter,
			endingBefore: null,
			offset: null,
		}
	}

	if (!cursor) {
		return {
			direction,
			startingAfter: null,
			endingBefore: null,
			offset: null,
		}
	}

	const resolvedId = resolveCursorId(cursor)

	if (direction === "backward") {
		return {
			direction,
			startingAfter: null,
			endingBefore: resolvedId,
			offset: null,
		}
	}

	return {
		direction,
		startingAfter: resolvedId,
		endingBefore: null,
		offset: null,
	}
}

// =============================================================================
// GET Handler
// =============================================================================

/**
 * GET /api/history
 * Get paginated chat history for the current user with cursor-based pagination.
 * Rate limited: 100 requests per minute per user.
 */
export async function GET(request: Request) {
	try {
		const userId = await requireAuthAction()

		// Check rate limit
		const rateLimitResult = await checkApiLimit(userId)
		if (!rateLimitResult.success) {
			const retryAfterSeconds = getRetryAfter(rateLimitResult.reset)
			return rateLimit(retryAfterSeconds)
		}

		// Parse and validate query parameters
		const { searchParams } = new URL(request.url)
		const queryParams = historyQuerySchema.safeParse({
			cursor: searchParams.get("cursor") ?? undefined,
			starting_after: searchParams.get("starting_after") ?? undefined,
			ending_before: searchParams.get("ending_before") ?? undefined,
			offset: searchParams.get("offset") ?? undefined,
			limit: searchParams.get("limit") ?? undefined,
			direction: searchParams.get("direction") ?? undefined,
			q: searchParams.get("q") ?? undefined,
			from: searchParams.get("from") ?? undefined,
			to: searchParams.get("to") ?? undefined,
		})

		if (!queryParams.success) {
			return error(
				new ValidationError("Invalid query parameters", {
					errors: queryParams.error.flatten().fieldErrors,
				}),
			)
		}

		const {
			cursor,
			starting_after,
			ending_before,
			offset,
			limit,
			direction,
			q,
			from,
			to,
		} = queryParams.data

		const adapterInput: HistoryCursorAdapterInput = {
			limit,
			direction,
		}

		if (cursor !== undefined) {
			adapterInput.cursor = cursor
		}
		if (starting_after !== undefined) {
			adapterInput.startingAfter = starting_after
		}
		if (ending_before !== undefined) {
			adapterInput.endingBefore = ending_before
		}
		if (offset !== undefined) {
			adapterInput.offset = offset
		}

		const normalized = applyHistoryCursorAdapter(adapterInput)

		const conditions: SQL<unknown>[] = [eq(chat.userId, userId)]

		if (q && q.trim() !== "") {
			conditions.push(ilike(chat.title, `%${q.trim()}%`))
		}

		if (from) {
			const fromDate = new Date(from)
			if (Number.isNaN(fromDate.getTime())) {
				return error(
					new ValidationError("Invalid from date", {
						field: "from",
					}),
				)
			}
			conditions.push(gte(chat.updatedAt, fromDate))
		}

		if (to) {
			const toDate = new Date(to)
			if (Number.isNaN(toDate.getTime())) {
				return error(
					new ValidationError("Invalid to date", {
						field: "to",
					}),
				)
			}
			const endOfDay = new Date(toDate)
			endOfDay.setHours(23, 59, 59, 999)
			conditions.push(lte(chat.updatedAt, endOfDay))
		}

		const whereClause =
			conditions.length > 1 ? and(...conditions) : conditions[0]

		const isOffsetPagination = normalized.offset !== null
		const offsetValue = normalized.offset ?? 0

		let chats: Chat[] = []
		let hasMore = false

		if (isOffsetPagination) {
			const rows = await db
				.select()
				.from(chat)
				.where(whereClause)
				.orderBy(desc(chat.updatedAt))
				.limit(Math.min(offsetValue + limit + 1, 10_101))

			chats = rows.slice(offsetValue, offsetValue + limit)
			hasMore = rows.length > offsetValue + limit
		} else {
			const routeCursorId =
				normalized.startingAfter ?? normalized.endingBefore

			let cursor: string | undefined
			if (routeCursorId) {
				cursor = await resolveCursorToUpdatedAtCursor(
					userId,
					routeCursorId,
				)
			}

			const paginationParams: CursorPaginationParams = {
				limit,
				direction: normalized.direction,
			}

			if (cursor !== undefined) {
				paginationParams.cursor = cursor
			}

			const query = db.select().from(chat).where(whereClause).$dynamic()

			const paginated = await applyCursorPagination<Chat>(
				query,
				chat as unknown as Record<string, unknown>,
				paginationParams,
				{
					sortField: "updatedAt",
					sortOrder: "desc",
				},
			)

			chats = paginated.items
			hasMore = paginated.hasMore
		}

		// Generate cursors from the results (ID-based contract)
		let nextCursor: string | null = null
		let prevCursor: string | null = null

		if (chats.length > 0) {
			const firstChat = chats[0]
			const lastChat = chats.at(-1)

			// Next cursor: last record's ID (for forward pagination)
			if (lastChat && hasMore) {
				nextCursor = lastChat.id
			}

			// Previous cursor: first record's ID (for backward pagination)
			if (
				firstChat &&
				(isOffsetPagination
					? offsetValue > 0
					: normalized.startingAfter !== null ||
						normalized.endingBefore !== null)
			) {
				prevCursor = firstChat.id
			}
		}

		// Build cursor-paginated result
		const paginatedResult: CursorPaginatedResult<(typeof chats)[0]> = {
			data: chats,
			nextCursor,
			prevCursor,
			hasMore,
		}

		// Create response with pagination metadata
		const baseUrl = "/api/history"
		const responseBody = createPaginationResponse(paginatedResult, baseUrl)

		const response = success(responseBody)

		// Add Cache-Control header for browser caching
		// private: response is user-specific, don't cache in shared caches
		// max-age=30: browser can use cached response for 30 seconds
		// stale-while-revalidate=60: can serve stale response for up to 60 seconds while revalidating
		response.headers.set(
			"Cache-Control",
			"private, max-age=30, stale-while-revalidate=60",
		)

		// Add rate limit headers
		const rateLimitHeaders = createRateLimitHeaders(rateLimitResult)
		rateLimitHeaders.forEach((value, key) => {
			response.headers.set(key, value)
		})

		return response
	} catch (err) {
		return error(err)
	}
}

/**
 * DELETE /api/history
 * Delete all chats for the current user.
 * Rate limited: 10 requests per minute per user (strict for destructive operations).
 */
export async function DELETE() {
	try {
		const userId = await requireAuthAction()

		// Check strict rate limit for destructive operation
		const rateLimitResult = await checkStrictLimit(userId)
		if (!rateLimitResult.success) {
			const retryAfterSeconds = getRetryAfter(rateLimitResult.reset)
			return rateLimit(retryAfterSeconds)
		}

		const result = await deleteAllChatsAction()

		if (!result.success) {
			return error(result.error ?? "Failed to delete chats")
		}

		const response = success({ deletedCount: result.deletedCount })
		const headers = createRateLimitHeaders(rateLimitResult)
		headers.forEach((value, key) => {
			response.headers.set(key, value)
		})
		return response
	} catch (err) {
		return error(err)
	}
}
