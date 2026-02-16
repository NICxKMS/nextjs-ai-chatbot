/**
 * User Query Modules
 *
 * Complex database queries for user operations that don't fit the repository
 * pattern - includes joins with related entities and aggregations.
 *
 * @module lib/data/queries/user.queries
 */

import "server-only"

import { count, desc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import type { Chat, User } from "@/lib/db/schema"
import { chat, message, user } from "@/lib/db/schema"
import { logDebug, logError } from "@/lib/log"

// =============================================================================
// Query Result Types
// =============================================================================

/**
 * User with their chats
 */
export interface UserWithChats {
	/** User data */
	user: User
	/** User's chats */
	chats: Chat[]
}

/**
 * User statistics for dashboard/analytics
 */
export interface UserStats {
	/** Total number of chats */
	totalChats: number
	/** Total number of messages sent */
	totalMessages: number
	/** Date of last login */
	lastLogin: Date | null
	/** Account creation date */
	memberSince: Date
	/** Number of public chats */
	publicChats: number
	/** Number of private chats */
	privateChats: number
}

// =============================================================================
// User Query Functions
// =============================================================================

/**
 * Get a user with all their chats.
 * Useful for user profile pages or data export.
 *
 * @param userId - User ID to fetch
 * @returns User with chats, or null if not found
 */
export async function getUserWithChats(
	userId: string,
): Promise<UserWithChats | null> {
	try {
		// Fetch user
		const [userResult] = await db
			.select()
			.from(user)
			.where(eq(user.id, userId))
			.limit(1)

		if (!userResult) {
			return null
		}

		// Fetch user's chats
		const chatsResult = await db
			.select()
			.from(chat)
			.where(eq(chat.userId, userId))
			.orderBy(desc(chat.updatedAt))

		logDebug("getUserWithChats completed", {
			userId,
			chatCount: chatsResult.length,
		})

		return {
			user: userResult,
			chats: chatsResult,
		}
	} catch (error) {
		logError("getUserWithChats error", error as Error, { userId })
		throw error
	}
}

/**
 * Get user statistics for dashboard display.
 * Aggregation query combining data from multiple tables.
 *
 * @param userId - User ID to get stats for
 * @returns User statistics
 */
export async function getUserStats(userId: string): Promise<UserStats> {
	try {
		// Get user info
		const [userResult] = await db
			.select({
				createdAt: user.createdAt,
				lastLogin: user.lastLogin,
			})
			.from(user)
			.where(eq(user.id, userId))
			.limit(1)

		if (!userResult) {
			throw new Error(`User not found: ${userId}`)
		}

		// Get chat counts
		const [chatCounts] = await db
			.select({
				total: count(),
				publicCount: sql<number>`COUNT(*) FILTER (WHERE ${chat.visibility} = 'public')`,
				privateCount: sql<number>`COUNT(*) FILTER (WHERE ${chat.visibility} = 'private')`,
			})
			.from(chat)
			.where(eq(chat.userId, userId))

		// Get message count across all user's chats
		const [messageCount] = await db
			.select({ count: count() })
			.from(message)
			.innerJoin(chat, eq(message.chatId, chat.id))
			.where(eq(chat.userId, userId))

		const stats: UserStats = {
			totalChats: chatCounts?.total ?? 0,
			totalMessages: messageCount?.count ?? 0,
			lastLogin: userResult.lastLogin,
			memberSince: userResult.createdAt,
			publicChats: Number(chatCounts?.publicCount ?? 0),
			privateChats: Number(chatCounts?.privateCount ?? 0),
		}

		logDebug("getUserStats completed", { userId, stats })

		return stats
	} catch (error) {
		logError("getUserStats error", error as Error, { userId })
		throw error
	}
}

// =============================================================================
// Query Module Export
// =============================================================================

/**
 * User queries module object for convenient access
 */
export const userQueries = {
	getUserWithChats,
	getUserStats,
}
