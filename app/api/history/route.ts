/**
 * Chat History API Route
 *
 * Lists user's chat history with cursor-based pagination. Delegates to feature actions.
 * Rate limited to prevent abuse.
 *
 * Query Parameters:
 * - cursor: (optional) Pagination cursor (encoded timestamp)
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

import { z } from "zod"
import { deleteAllChatsAction, getHistoryAction } from "@/features/chat/actions"
import { error, rateLimit, success } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"
import {
	type CursorPaginatedResult,
	createPaginationResponse,
} from "@/lib/db/pagination"
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
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	direction: z.enum(["forward", "backward"]).default("forward"),
	q: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
})

// =============================================================================
// Cursor Codec (for encoding/decoding timestamps)
// =============================================================================

/**
 * Cursor encoding/decoding utilities for pagination.
 * Uses base64url encoding for URL-safe cursors.
 */
const CursorCodec = {
	/**
	 * Encode a timestamp into a cursor string.
	 * @param timestamp - Date to encode
	 * @returns Base64url encoded cursor string
	 */
	encode(timestamp: Date): string {
		return Buffer.from(timestamp.toISOString()).toString("base64url")
	},

	/**
	 * Decode a cursor string into a timestamp.
	 * @param cursor - Base64url encoded cursor string
	 * @returns Decoded Date
	 * @throws ValidationError if cursor format is invalid
	 */
	decode(cursor: string): Date {
		try {
			const iso = Buffer.from(cursor, "base64url").toString("utf-8")
			const date = new Date(iso)
			if (Number.isNaN(date.getTime())) {
				throw new Error("Invalid date")
			}
			return date
		} catch {
			throw new ValidationError("Invalid cursor format", { cursor })
		}
	},
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

		const { cursor, limit, direction, q, from, to } = queryParams.data

		// Build pagination options for the action
		// The action uses startingAfter/endingBefore which are chat IDs
		// For cursor-based pagination, we need to convert the cursor to the appropriate format
		const result = await getHistoryAction({
			limit,
			// For now, we pass null for cursor params - the repository handles cursor logic
			// The cursor is used to generate nextCursor in the response
			startingAfter: direction === "forward" && cursor ? cursor : null,
			endingBefore: direction === "backward" && cursor ? cursor : null,
			searchQuery: q && q.trim() !== "" ? q.trim() : null,
			fromDate: from ?? null,
			toDate: to ?? null,
		})

		if (!result.success) {
			return error(result.error ?? "Failed to get history")
		}

		const chats = result.chats ?? []
		const hasMore = result.hasMore ?? false

		// Generate cursors from the results
		// Use updatedAt timestamps for cursors (consistent with sorting)
		let nextCursor: string | null = null
		let prevCursor: string | null = null

		if (chats.length > 0) {
			const firstChat = chats[0]
			const lastChat = chats.at(-1)

			// Next cursor: last record's updatedAt (for forward pagination)
			if (lastChat && hasMore) {
				nextCursor = CursorCodec.encode(lastChat.updatedAt)
			}

			// Previous cursor: first record's updatedAt (for backward pagination)
			// Only set if we have a cursor (not at the start)
			if (firstChat && cursor) {
				prevCursor = CursorCodec.encode(firstChat.updatedAt)
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
