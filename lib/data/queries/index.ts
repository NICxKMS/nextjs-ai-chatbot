/**
 * Query Modules Index
 *
 * Barrel export for all query modules. Provides complex database queries
 * that don't fit the repository pattern (joins, aggregations, search).
 *
 * @module lib/data/queries
 */

export type {
	ChatSearchResult,
	ChatStats,
	ChatWithLatestMessage,
	ChatWithMessageCount,
	ChatWithMessagesAndArtifacts,
} from "./chat.queries"
// Chat queries
export {
	chatQueries,
	getChatStats,
	getChatsWithinDateRange,
	getChatsWithMessageCount,
	getChatWithLatestMessage,
	getChatWithMessagesAndArtifacts,
	searchChats,
} from "./chat.queries"
export type { UserStats, UserWithChats } from "./user.queries"
// User queries
export { getUserStats, getUserWithChats, userQueries } from "./user.queries"
