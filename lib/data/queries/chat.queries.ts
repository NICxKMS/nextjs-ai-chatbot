/**
 * Chat Query Modules
 *
 * Complex database queries for chat operations that don't fit the repository
 * pattern - includes joins, aggregations, and full-text search.
 *
 * @module lib/data/queries/chat.queries
 */

import "server-only"

import { and, count, desc, eq, gte, lte, or, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import type { Artifact, Chat, Message } from "@/lib/db/schema"
import { artifact, chat, message } from "@/lib/db/schema"
import { logDebug, logError } from "@/lib/log"

// =============================================================================
// Query Result Types
// =============================================================================

/**
 * Chat with message count for list display
 */
export interface ChatWithMessageCount extends Chat {
	/** Number of messages in the chat */
	messageCount: number
}

/**
 * Chat with latest message preview
 */
export interface ChatWithLatestMessage extends Chat {
	/** The most recent message in the chat */
	latestMessage: Message | null
}

/**
 * Chat with full data including messages and artifacts
 */
export interface ChatWithMessagesAndArtifacts {
	/** Chat metadata */
	chat: Chat
	/** All messages in the chat */
	messages: Message[]
	/** All artifacts associated with the chat */
	artifacts: Artifact[]
}

/**
 * Search result for chat content
 */
export interface ChatSearchResult {
	/** The matching chat */
	chat: Chat
	/** Messages that matched the search query */
	matchedMessages: Message[]
	/** Relevance score (higher is more relevant) */
	relevanceScore: number
}

/**
 * Chat statistics for a user
 */
export interface ChatStats {
	/** Total number of chats */
	totalChats: number
	/** Total number of messages */
	totalMessages: number
	/** Date of most recent chat activity */
	lastActivityAt: Date | null
	/** Number of public chats */
	publicChats: number
	/** Number of private chats */
	privateChats: number
}

// =============================================================================
// Chat Query Functions
// =============================================================================

/**
 * Get a chat with all its messages and artifacts.
 * Complex join query that fetches related data in a single operation.
 *
 * @param chatId - The chat ID to fetch
 * @returns Chat with messages and artifacts, or null if not found
 */
export async function getChatWithMessagesAndArtifacts(
	chatId: string,
): Promise<ChatWithMessagesAndArtifacts | null> {
	try {
		// Fetch chat
		const [chatResult] = await db
			.select()
			.from(chat)
			.where(eq(chat.id, chatId))
			.limit(1)

		if (!chatResult) {
			return null
		}

		// Fetch messages and artifacts in parallel
		const [messagesResult, artifactsResult] = await Promise.all([
			db
				.select()
				.from(message)
				.where(eq(message.chatId, chatId))
				.orderBy(message.createdAt),
			db
				.select()
				.from(artifact)
				.where(eq(artifact.chatId, chatId))
				.orderBy(desc(artifact.createdAt)),
		])

		logDebug("getChatWithMessagesAndArtifacts completed", {
			chatId,
			messageCount: messagesResult.length,
			artifactCount: artifactsResult.length,
		})

		return {
			chat: chatResult,
			messages: messagesResult as Message[],
			artifacts: artifactsResult as Artifact[],
		}
	} catch (error) {
		logError("getChatWithMessagesAndArtifacts error", error as Error, {
			chatId,
		})
		throw error
	}
}

/**
 * Search chats by message content.
 * Full-text search across all messages in a user's chats.
 *
 * @param userId - User ID to search within
 * @param query - Search query string
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of search results with relevance scores
 */
export async function searchChats(
	userId: string,
	query: string,
	limit = 10,
): Promise<ChatSearchResult[]> {
	try {
		// Sanitize query for ILIKE search
		const searchPattern = `%${query.replace(/[%_]/g, "\\$&")}%`

		// Find messages matching the search query
		const matchingMessages = await db
			.select({
				message: message,
				chat: chat,
			})
			.from(message)
			.innerJoin(chat, eq(message.chatId, chat.id))
			.where(
				and(
					eq(chat.userId, userId),
					or(
						// Search in message parts (JSONB)
						sql`${message.parts}::text ILIKE ${searchPattern}`,
					),
				),
			)
			.orderBy(desc(message.createdAt))
			.limit(limit * 5) // Get more to group by chat

		// Group by chat and calculate relevance
		const chatMap = new Map<
			string,
			{ chat: Chat; messages: Message[]; score: number }
		>()

		for (const { message: msg, chat: chatObj } of matchingMessages) {
			const existing = chatMap.get(chatObj.id)
			if (existing) {
				existing.messages.push(msg as Message)
				existing.score += 1
			} else {
				chatMap.set(chatObj.id, {
					chat: chatObj,
					messages: [msg as Message],
					score: 1,
				})
			}
		}

		// Sort by relevance and limit
		const results = Array.from(chatMap.values())
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map((item) => ({
				chat: item.chat,
				matchedMessages: item.messages,
				relevanceScore: item.score,
			}))

		logDebug("searchChats completed", {
			userId,
			query,
			resultCount: results.length,
		})

		return results
	} catch (error) {
		logError("searchChats error", error as Error, { userId, query })
		throw error
	}
}

/**
 * Get chat statistics for a user.
 * Aggregation query for dashboard/analytics display.
 *
 * @param userId - User ID to get stats for
 * @returns Chat statistics
 */
export async function getChatStats(userId: string): Promise<ChatStats> {
	try {
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

		// Get last activity
		const [lastActivity] = await db
			.select({ updatedAt: chat.updatedAt })
			.from(chat)
			.where(eq(chat.userId, userId))
			.orderBy(desc(chat.updatedAt))
			.limit(1)

		const stats: ChatStats = {
			totalChats: chatCounts?.total ?? 0,
			totalMessages: messageCount?.count ?? 0,
			lastActivityAt: lastActivity?.updatedAt ?? null,
			publicChats: Number(chatCounts?.publicCount ?? 0),
			privateChats: Number(chatCounts?.privateCount ?? 0),
		}

		logDebug("getChatStats completed", { userId, stats })

		return stats
	} catch (error) {
		logError("getChatStats error", error as Error, { userId })
		throw error
	}
}

/**
 * Get chats with message counts for list display.
 * Uses a subquery to efficiently count messages per chat.
 *
 * @param userId - User ID to get chats for
 * @param limit - Maximum number of chats to return
 * @returns Array of chats with message counts
 */
export async function getChatsWithMessageCount(
	userId: string,
	limit = 20,
): Promise<ChatWithMessageCount[]> {
	try {
		// Get chats with message counts using a join
		const results = await db
			.select({
				id: chat.id,
				createdAt: chat.createdAt,
				updatedAt: chat.updatedAt,
				title: chat.title,
				userId: chat.userId,
				visibility: chat.visibility,
				lastContext: chat.lastContext,
				messageCount: sql<number>`(
          SELECT COUNT(*) FROM ${message} 
          WHERE ${message.chatId} = ${chat.id}
        )`,
			})
			.from(chat)
			.where(eq(chat.userId, userId))
			.orderBy(desc(chat.updatedAt))
			.limit(limit)

		logDebug("getChatsWithMessageCount completed", {
			userId,
			count: results.length,
		})

		return results as ChatWithMessageCount[]
	} catch (error) {
		logError("getChatsWithMessageCount error", error as Error, { userId })
		throw error
	}
}

/**
 * Get chat with its latest message.
 * Useful for chat list previews.
 *
 * @param chatId - Chat ID to fetch
 * @returns Chat with latest message or null
 */
export async function getChatWithLatestMessage(
	chatId: string,
): Promise<ChatWithLatestMessage | null> {
	try {
		const [chatResult] = await db
			.select()
			.from(chat)
			.where(eq(chat.id, chatId))
			.limit(1)

		if (!chatResult) {
			return null
		}

		const [latestMsg] = await db
			.select()
			.from(message)
			.where(eq(message.chatId, chatId))
			.orderBy(desc(message.createdAt))
			.limit(1)

		return {
			...chatResult,
			latestMessage: (latestMsg as Message) ?? null,
		}
	} catch (error) {
		logError("getChatWithLatestMessage error", error as Error, { chatId })
		throw error
	}
}

/**
 * Get chats created within a date range.
 *
 * @param userId - User ID to filter by
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Array of chats within the date range
 */
export async function getChatsWithinDateRange(
	userId: string,
	startDate: Date,
	endDate: Date,
): Promise<Chat[]> {
	try {
		const results = await db
			.select()
			.from(chat)
			.where(
				and(
					eq(chat.userId, userId),
					gte(chat.createdAt, startDate),
					lte(chat.createdAt, endDate),
				),
			)
			.orderBy(desc(chat.createdAt))

		logDebug("getChatsWithinDateRange completed", {
			userId,
			count: results.length,
			startDate,
			endDate,
		})

		return results
	} catch (error) {
		logError("getChatsWithinDateRange error", error as Error, {
			userId,
			startDate,
			endDate,
		})
		throw error
	}
}

// =============================================================================
// Query Module Export
// =============================================================================

/**
 * Chat queries module object for convenient access
 */
export const chatQueries = {
	getChatWithMessagesAndArtifacts,
	searchChats,
	getChatStats,
	getChatsWithMessageCount,
	getChatWithLatestMessage,
	getChatsWithinDateRange,
}
