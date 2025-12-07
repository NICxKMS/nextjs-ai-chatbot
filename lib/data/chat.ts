import "server-only";

import { and, asc, desc, eq, gt, gte, inArray, lt } from "drizzle-orm";
import type { VisibilityType } from "@/components/visibility-selector";
import { logError } from "@/lib/log";
import {
	batchUpdateChatCache,
	createOrUpdateChatWithMessages,
} from "../cache/batch-operations";
import { dbMessageToCachedMessage } from "../cache/helpers";
import {
	appendMessagesToCache,
	chatToCache,
	deleteChatFromCache,
	deleteMessagesFromCacheAfterTimestamp,
	getChatFromCache,
	getUserChatsFromCache,
	setChatInCache,
	updateChatLastContextInCache,
	updateChatTitleInCache,
	updateChatVisibilityInCache,
	warmChatCache,
} from "../cache/operations";
import { incrementUserMessageCountAsync } from "../cache/quota";
import { getRedisClient, isRedisAvailable } from "../cache/redis";
import type { CachedMessage } from "../cache/types";
import { CacheKeys } from "../cache/types";
import { db } from "../db/queries";
import type { Chat, DBMessage, MessageRow } from "../db/schema";
import { chat, message, vote } from "../db/schema";
import { ChatSDKError, toDatabaseError } from "../errors";
import type { AppUsage } from "../usage";
import type {
	ChatWithMessages,
	DataContext,
	PaginatedResult,
	PaginationParams,
} from "./base";

/**
 * ==============================================================================
 * CHAT DATA ACCESS LAYER
 * ==============================================================================
 *
 * Unified chat operations with cache-first strategy.
 * Automatically handles guest (cache-only) vs authenticated (cache+DB) flows.
 *
 * Key principles:
 * - Cache checked FIRST for all operations (guest and auth)
 * - Cache miss for guests → return null (no DB call, no empty cache write)
 * - Cache miss for auth → single DB query, warm cache in background
 * - Write operations: cache always updated, DB write only for auth users
 * - Zero extra DB/cache calls compared to original implementation
 */

/**
 * Chat data access methods
 */
export const chatData = {
	/**
	 * Get chat by ID (cache-first)
	 *
	 * Flow:
	 * 1. Check cache (for both guest and auth users)
	 * 2. Cache hit → return chat metadata
	 * 3. Cache miss + guest → return null (NO DB call)
	 * 4. Cache miss + auth → query DB, warm cache in background, return
	 *
	 * @param chatId Chat UUID
	 * @param ctx Data context (userId, isGuest)
	 * @returns Chat metadata or null if not found
	 */
	get: async (
		chatId: string,
		ctx: DataContext,
		opts?: { warmCache?: boolean }
	): Promise<Chat | null> => {
		try {
			// Try cache first if Redis is available
			if (isRedisAvailable()) {
				const cached = await getChatFromCache(chatId, ctx.userId);
				if (cached) {
					// Return chat metadata (without messages)
					return {
						id: cached.id,
						userId: cached.userId,
						title: cached.title,
						visibility: cached.visibility,
						createdAt: new Date(cached.createdAt),
						updatedAt: new Date(cached.updatedAt),
						lastContext: cached.lastContext,
					} as Chat;
				}
			}

			// Guest users: cache-only, return null if not in cache
			if (ctx.isGuest) {
				return null;
			}

			// Authenticated users: cache miss - fetch from database
			const [chatFromDb] = await db
				.select()
				.from(chat)
				.where(eq(chat.id, chatId));

			if (!chatFromDb) {
				return null;
			}

			// Warm cache in background if enabled and userId matches
			const shouldWarmCache = opts?.warmCache ?? true;
			if (
				isRedisAvailable() &&
				shouldWarmCache &&
				chatFromDb.userId === ctx.userId
			) {
				// Fetch messages for cache warming (don't block)
				// Note: Both DB fetch and warmChatCache errors are caught
				db.select()
					.from(message)
					.where(eq(message.chatId, chatId))
					.orderBy(asc(message.createdAt))
					.then((messages) =>
						warmChatCache(
							chatId,
							ctx.userId,
							chatFromDb,
							messages as DBMessage[]
						).catch((err) => logError("Cache warming failed", err))
					)
					.catch((err) =>
						logError("Cache warming DB fetch failed", err)
					);
			}

			return chatFromDb;
		} catch (error) {
			throw toDatabaseError(
				"get_chat_by_id",
				error,
				"Failed to get chat by id"
			);
		}
	},

	/**
	 * Get chat with messages in single operation (optimized)
	 *
	 * Eliminates duplicate Redis GET requests by returning both chat metadata
	 * and messages from the denormalized cache structure in one fetch.
	 *
	 * Flow:
	 * 1. Check cache (single GET returns chat + messages)
	 * 2. Cache hit → return both chat and messages
	 * 3. Cache miss + guest → return null (NO DB call)
	 * 4. Cache miss + auth → query DB (chat + messages), warm cache, return
	 *
	 * @param chatId Chat UUID
	 * @param ctx Data context (userId, isGuest)
	 * @returns Chat with messages or null if not found
	 */
	getWithMessages: async (
		chatId: string,
		ctx: DataContext
	): Promise<ChatWithMessages | null> => {
		try {
			// Try cache first if Redis is available
			if (isRedisAvailable()) {
				const cached = await getChatFromCache(chatId, ctx.userId);
				if (cached) {
					// Return BOTH chat metadata AND messages from single fetch
					const chatMeta = {
						id: cached.id,
						userId: cached.userId,
						title: cached.title,
						visibility: cached.visibility,
						createdAt: new Date(cached.createdAt),
						updatedAt: new Date(cached.updatedAt),
						lastContext: cached.lastContext,
					} as Chat;

					const messagesData = cached.messages.map((msg) => ({
						id: msg.id,
						chatId: msg.chatId,
						role: msg.role,
						parts: msg.parts,
						attachments: msg.attachments,
						createdAt: new Date(msg.createdAt),
					})) as MessageRow[];

					return {
						chat: chatMeta,
						messages: messagesData,
					};
				}
			}

			// Guest users: cache-only, return null if not in cache
			if (ctx.isGuest) {
				return null;
			}

			// Authenticated users: cache miss - fetch from database
			const [chatFromDb] = await db
				.select()
				.from(chat)
				.where(eq(chat.id, chatId));

			if (!chatFromDb) {
				return null;
			}

			// Fetch messages from database
			const messagesFromDb = await db
				.select()
				.from(message)
				.where(eq(message.chatId, chatId))
				.orderBy(asc(message.createdAt));

			// Warm cache in background
			if (isRedisAvailable() && chatFromDb.userId === ctx.userId) {
				warmChatCache(
					chatId,
					ctx.userId,
					chatFromDb,
					messagesFromDb as DBMessage[]
				).catch((err) => logError("Cache warming failed", err));
			}

			return {
				chat: chatFromDb,
				messages: messagesFromDb,
			};
		} catch (error) {
			throw toDatabaseError(
				"get_chat_with_messages_by_id",
				error,
				"Failed to get chat with messages by id"
			);
		}
	},

	/**
	 * Get paginated list of user's chats
	 *
	 * Flow:
	 * - Guest users: fetch from cache ZSET + batch MGET
	 * - Auth users: query DB with pagination
	 *
	 * @param pagination Pagination parameters
	 * @param ctx Data context (userId, isGuest)
	 * @returns Paginated list of chats
	 */
	list: async (
		pagination: PaginationParams,
		ctx: DataContext
	): Promise<PaginatedResult<Chat>> => {
		try {
			const { limit, startingAfter, endingBefore } = pagination;

			// Guest users: cache-only
			if (ctx.isGuest) {
				const extendedLimit = limit + 1;
				const offset = 0;

				const chatList = await getUserChatsFromCache(
					ctx.userId,
					extendedLimit,
					offset
				);

				// OPTIMIZATION: Batch fetch with MGET instead of N+1 pattern
				const redis = getRedisClient();
				if (!redis || chatList.length === 0) {
					return { items: [], hasMore: false };
				}

				const cacheKeys = chatList.map((item) =>
					CacheKeys.chatMeta(item.chatId, ctx.userId)
				);
				const cachedChats = await redis.mget<any[]>(...cacheKeys);

				// Convert to full chat objects
				const chats = cachedChats
					.map((cached) => {
						if (!cached) {
							return null;
						}

						return {
							id: cached.id,
							userId: cached.userId,
							title: cached.title,
							visibility: cached.visibility,
							createdAt: new Date(cached.createdAt),
							updatedAt: new Date(cached.updatedAt),
							lastContext: cached.lastContext,
						};
					})
					.filter((c): c is Chat => c !== null);

				const hasMore = chats.length > limit;

				return {
					items: hasMore ? chats.slice(0, limit) : chats,
					hasMore,
				};
			}

			// Authenticated users: DB query with pagination
			const extendedLimit = limit + 1;

			const query = (whereCondition?: any) =>
				db
					.select()
					.from(chat)
					.where(
						whereCondition
							? and(whereCondition, eq(chat.userId, ctx.userId))
							: eq(chat.userId, ctx.userId)
					)
					.orderBy(desc(chat.createdAt))
					.limit(extendedLimit);

			let filteredChats: Chat[] = [];

			if (startingAfter) {
				const [selectedChat] = await db
					.select()
					.from(chat)
					.where(eq(chat.id, startingAfter))
					.limit(1);

				if (!selectedChat) {
					throw new ChatSDKError(
						"not_found:database",
						`Chat with id ${startingAfter} not found`
					);
				}

				filteredChats = await query(
					gt(chat.createdAt, selectedChat.createdAt)
				);
			} else if (endingBefore) {
				const [selectedChat] = await db
					.select()
					.from(chat)
					.where(eq(chat.id, endingBefore))
					.limit(1);

				if (!selectedChat) {
					throw new ChatSDKError(
						"not_found:database",
						`Chat with id ${endingBefore} not found`
					);
				}

				filteredChats = await query(
					lt(chat.createdAt, selectedChat.createdAt)
				);
			} else {
				filteredChats = await query();
			}

			const hasMore = filteredChats.length > limit;

			return {
				items: hasMore ? filteredChats.slice(0, limit) : filteredChats,
				hasMore,
			};
		} catch (error) {
			throw toDatabaseError(
				"get_chats_by_user_id",
				error,
				"Failed to get chats by user id"
			);
		}
	},

	/**
	 * Create a new chat
	 *
	 * Flow:
	 * - Guest users: write to cache only
	 * - Auth users: write to DB + cache in parallel
	 *
	 * @param params Chat creation parameters
	 * @param ctx Data context (userId, isGuest)
	 * @returns Created chat
	 */
	create: async (
		params: {
			id: string;
			title: string;
			visibility: VisibilityType;
			skipCache?: boolean;
		},
		ctx: DataContext
	): Promise<Chat> => {
		try {
			const { id, title, visibility, skipCache = false } = params;
			const now = new Date();
			const newChat = {
				id,
				createdAt: now,
				userId: ctx.userId,
				title,
				visibility,
				updatedAt: now,
				lastContext: null,
			};

			if (ctx.isGuest) {
				// Guest users: cache-only, no database write
				await setChatInCache(
					id,
					ctx.userId,
					chatToCache(newChat as Chat, [])
				);
				return newChat as Chat;
			}

			// Authenticated users: write to DB
			const dbPromise = db.insert(chat).values(newChat);

			// Optionally skip cache (will be created later with messages)
			const cachePromise =
				!skipCache && isRedisAvailable()
					? setChatInCache(
							id,
							ctx.userId,
							chatToCache(newChat as Chat, [])
						)
					: Promise.resolve();

			await Promise.all([dbPromise, cachePromise]);
			return newChat as Chat;
		} catch (error) {
			// If the user doesn't exist, inserting a chat will violate the FK constraint.
			// Translate that specific failure into a 404 so the client can recover by redirecting.
			const errorCode = (error as { code?: string })?.code;
			if (errorCode === "23503") {
				throw new ChatSDKError("not_found:auth:user", "User not found");
			}
			throw toDatabaseError("save_chat", error, "Failed to save chat");
		}
	},

	/**
	 * Delete a chat and all related data
	 *
	 * Flow:
	 * - Guest users: delete from cache only
	 * - Auth users: delete from DB (cascade) + cache in parallel
	 *
	 * @param chatId Chat UUID
	 * @param ctx Data context (userId, isGuest)
	 * @returns Deleted chat (or undefined for guests)
	 */
	delete: async (
		chatId: string,
		ctx: DataContext
	): Promise<Chat | undefined> => {
		try {
			if (ctx.isGuest) {
				// Guest users: cache-only deletion
				await deleteChatFromCache(chatId, ctx.userId);
				return;
			}

			// Authenticated users: delete from DB and cache in parallel
			const dbPromise = (async () => {
				// Delete votes and messages in parallel (both depend on chat, not each other)
				await Promise.all([
					db.delete(vote).where(eq(vote.chatId, chatId)),
					db.delete(message).where(eq(message.chatId, chatId)),
				]);

				// Then delete the chat (must be after votes/messages due to FK)
				const deletedChats = await db
					.delete(chat)
					.where(eq(chat.id, chatId))
					.returning();

				return deletedChats[0];
			})();

			// Delete from cache in parallel (doesn't depend on DB operations)
			const cachePromise = isRedisAvailable()
				? deleteChatFromCache(chatId, ctx.userId)
				: Promise.resolve();

			const [result] = await Promise.all([dbPromise, cachePromise]);
			return result;
		} catch (error) {
			throw toDatabaseError(
				"delete_chat_by_id",
				error,
				"Failed to delete chat by id"
			);
		}
	},

	/**
	 * Delete all chats for a user
	 *
	 * @param ctx Data context (userId, isGuest)
	 * @returns Number of chats deleted
	 */
	deleteAll: async (ctx: DataContext): Promise<{ deletedCount: number }> => {
		try {
			if (ctx.isGuest) {
				// Get all chats for this user (use large limit to get all)
				const chatList = await getUserChatsFromCache(
					ctx.userId,
					1000,
					0
				);

				// Delete each chat from cache
				const deletePromises = chatList.map((item) =>
					deleteChatFromCache(item.chatId, ctx.userId)
				);

				await Promise.all(deletePromises);

				return { deletedCount: chatList.length };
			}

			// Authenticated users: delete from DB
			const userChats = await db
				.select({ id: chat.id })
				.from(chat)
				.where(eq(chat.userId, ctx.userId));

			if (userChats.length === 0) {
				return { deletedCount: 0 };
			}

			const chatIds = userChats.map((chatRec) => chatRec.id);

			// OPTIMIZATION: Delete votes and messages in parallel (both depend on chat, not each other)
			await Promise.all([
				db.delete(vote).where(inArray(vote.chatId, chatIds)),
				db.delete(message).where(inArray(message.chatId, chatIds)),
			]);

			const deletedChats = await db
				.delete(chat)
				.where(eq(chat.userId, ctx.userId))
				.returning();

			return { deletedCount: deletedChats.length };
		} catch (error) {
			throw toDatabaseError(
				"delete_all_chats_by_user_id",
				error,
				"Failed to delete all chats by user id"
			);
		}
	},

	/**
	 * Update chat title (optimized cache+DB update)
	 *
	 * @param chatId Chat UUID
	 * @param title New title
	 * @param ctx Data context (userId, isGuest)
	 */
	updateTitle: async (
		chatId: string,
		title: string,
		ctx: DataContext
	): Promise<void> => {
		try {
			// Run cache and DB updates in parallel
			const cachePromise = isRedisAvailable()
				? updateChatTitleInCache(chatId, ctx.userId, title)
				: Promise.resolve();

			const dbPromise = ctx.isGuest
				? Promise.resolve()
				: db
						.update(chat)
						.set({ title, updatedAt: new Date() })
						.where(eq(chat.id, chatId));

			await Promise.all([cachePromise, dbPromise]);
		} catch (error) {
			throw toDatabaseError(
				"update_chat_title",
				error,
				"Failed to update chat title by id"
			);
		}
	},

	/**
	 * Update chat visibility
	 *
	 * @param chatId Chat UUID
	 * @param visibility New visibility
	 * @param ctx Data context (userId, isGuest)
	 */
	updateVisibility: async (
		chatId: string,
		visibility: VisibilityType,
		ctx: DataContext
	): Promise<void> => {
		try {
			// Run cache and DB updates in parallel
			const cachePromise = isRedisAvailable()
				? updateChatVisibilityInCache(chatId, ctx.userId, visibility)
				: Promise.resolve();

			const dbPromise = ctx.isGuest
				? Promise.resolve()
				: db
						.update(chat)
						.set({ visibility, updatedAt: new Date() })
						.where(eq(chat.id, chatId));

			await Promise.all([cachePromise, dbPromise]);
		} catch (error) {
			throw toDatabaseError(
				"update_chat_visibility",
				error,
				"Failed to update chat visibility by id"
			);
		}
	},

	/**
	 * Update chat context (usage metadata)
	 *
	 * @param chatId Chat UUID
	 * @param context Usage context
	 * @param ctx Data context (userId, isGuest)
	 */
	updateContext: async (
		chatId: string,
		context: AppUsage,
		ctx: DataContext
	): Promise<void> => {
		try {
			// Run cache and DB updates in parallel
			const cachePromise = isRedisAvailable()
				? updateChatLastContextInCache(chatId, ctx.userId, context)
				: Promise.resolve();

			const dbPromise = ctx.isGuest
				? Promise.resolve()
				: db
						.update(chat)
						.set({ lastContext: context, updatedAt: new Date() })
						.where(eq(chat.id, chatId))
						.catch(async (err) => {
							const { logWarn } = await import("../log");
							logWarn("Failed to update lastContext for chat", {
								chatId,
								error: err,
							});
						});

			await Promise.all([cachePromise, dbPromise]);
		} catch (error) {
			const { logWarn } = await import("../log");
			logWarn("Failed to update lastContext for chat", { chatId, error });
		}
	},
};

/**
 * ==============================================================================
 * MESSAGE DATA ACCESS LAYER
 * ==============================================================================
 */

export const messageData = {
	/**
	 * Get all messages for a chat
	 *
	 * Flow:
	 * 1. Check cache (for both guest and auth users)
	 * 2. Cache hit → return messages from denormalized structure
	 * 3. Cache miss → query DB (auth only)
	 *
	 * @param chatId Chat UUID
	 * @param ctx Data context (userId, isGuest)
	 * @returns Array of messages
	 */
	getForChat: async (
		chatId: string,
		ctx: DataContext
	): Promise<MessageRow[]> => {
		try {
			// Try cache first if Redis is available
			if (isRedisAvailable()) {
				const cached = await getChatFromCache(chatId, ctx.userId);
				if (cached) {
					// Return messages from cached denormalized structure
					return cached.messages.map((msg) => ({
						id: msg.id,
						chatId: msg.chatId,
						role: msg.role,
						parts: msg.parts,
						attachments: msg.attachments,
						createdAt: new Date(msg.createdAt),
					})) as MessageRow[];
				}
			}

			// Guest users: cache-only
			if (ctx.isGuest) {
				return [];
			}

			// Cache miss - fetch from database
			return await db
				.select()
				.from(message)
				.where(eq(message.chatId, chatId))
				.orderBy(asc(message.createdAt));
		} catch (error) {
			throw toDatabaseError(
				"get_messages_by_chat_id",
				error,
				"Failed to get messages by chat id"
			);
		}
	},

	/**
	 * Save messages (bulk operation)
	 *
	 * Flow:
	 * - Guest users: append to cache only
	 * - Auth users: write to DB + update cache in parallel
	 *
	 * @param messages Array of messages to save
	 * @param ctx Data context (userId, isGuest)
	 */
	save: async (messages: DBMessage[], ctx: DataContext): Promise<void> => {
		try {
			// Guest users: cache-only, no database write
			if (ctx.isGuest) {
				if (!isRedisAvailable() || messages.length === 0) {
					return;
				}

				// Group messages by chatId
				const messagesByChatId = new Map<string, CachedMessage[]>();
				for (const msg of messages) {
					if (!msg.chatId) {
						continue;
					}

					const cachedMsg = dbMessageToCachedMessage(msg);

					if (!messagesByChatId.has(msg.chatId)) {
						messagesByChatId.set(msg.chatId, []);
					}
					const chatMessages = messagesByChatId.get(msg.chatId);
					if (chatMessages) {
						chatMessages.push(cachedMsg);
					}
				}

				// Bulk append for each chat (single cache operation per chat)
				const cachePromises = Array.from(
					messagesByChatId.entries()
				).map(([chatId, msgs]) =>
					appendMessagesToCache(chatId, ctx.userId, msgs)
				);

				await Promise.all(cachePromises);
				return;
			}

			// Authenticated users: write to DB and cache
			const dbPromise = db
				.insert(message)
				.values(messages)
				.onConflictDoNothing({ target: message.id });

			// Update cache in parallel - use bulk operation
			const cachePromises: Promise<void>[] = [];
			if (isRedisAvailable() && messages.length > 0) {
				// OPTIMIZATION: Group messages by chatId using context userId
				// No need to fetch chats - we're saving messages for the current user
				const messagesByChatId = new Map<string, CachedMessage[]>();

				for (const msg of messages) {
					if (!msg.chatId) {
						continue;
					}

					if (!messagesByChatId.has(msg.chatId)) {
						messagesByChatId.set(msg.chatId, []);
					}

					const chatMessages = messagesByChatId.get(msg.chatId);
					if (chatMessages) {
						chatMessages.push(dbMessageToCachedMessage(msg));
					}
				}

				// Bulk append for each chat - skip existence check as we trust the caller
				for (const [chatId, cachedMsgs] of messagesByChatId.entries()) {
					cachePromises.push(
						appendMessagesToCache(chatId, ctx.userId, cachedMsgs, {
							skipExistenceCheck: true,
						})
					);
				}
			}

			await Promise.all([dbPromise, ...cachePromises]);
			return;
		} catch (error) {
			throw toDatabaseError(
				"save_messages",
				error,
				"Failed to save messages"
			);
		}
	},

	/**
	 * Save messages and context in optimized batch operation
	 *
	 * Reduces cache operations from ~6 to ~2 (GET + SET) by batching
	 * messages and context update together.
	 *
	 * @param params Save parameters
	 * @param ctx Data context (userId, isGuest)
	 */
	saveWithContext: async (
		params: {
			messages: DBMessage[];
			chatId: string;
			lastContext?: AppUsage;
			isNewChat?: boolean;
			title?: string;
			visibility?: VisibilityType;
			createdAt?: Date;
		},
		ctx: DataContext
	): Promise<void> => {
		try {
			const {
				messages,
				chatId,
				lastContext,
				isNewChat,
				title,
				visibility,
				createdAt,
			} = params;

			// Convert messages to cached format using centralized helper
			const cachedMessages: CachedMessage[] = messages.map(
				dbMessageToCachedMessage
			);

			if (ctx.isGuest) {
				// Guest users: cache-only, no database write
				if (isNewChat && title && visibility) {
					// For new chats, create with messages in one operation
					// Pass isNewChat to skip redundant existence check
					await createOrUpdateChatWithMessages({
						chatId,
						userId: ctx.userId,
						title,
						visibility,
						messages: cachedMessages,
						lastContext,
						_isNewChat: true,
					});
				} else {
					// For existing chats, use batch update
					await batchUpdateChatCache({
						chatId,
						userId: ctx.userId,
						messages: cachedMessages,
						lastContext,
						title,
					});
				}

				// OPTIMIZATION: Increment quota counter for guest users (fire-and-forget)
				const userMessageCount = messages.filter(
					(msg) => msg.role === "user"
				).length;
				if (userMessageCount > 0) {
					incrementUserMessageCountAsync(
						ctx.userId,
						userMessageCount
					);
				}

				return;
			}

			// Authenticated users: save to DB
			const dbPromises: Promise<any>[] = [];

			// Create chat in DB if it's a new chat
			if (isNewChat && title && visibility) {
				dbPromises.push(
					db.insert(chat).values({
						id: chatId,
						userId: ctx.userId,
						title,
						visibility,
						createdAt: createdAt || new Date(),
						updatedAt: new Date(),
						lastContext: lastContext || null,
					})
				);
			}

			// Insert messages (waits for chat creation due to FK constraint)
			const messageInsertPromise = isNewChat
				? // For new chats, wait for chat creation first
					Promise.all(dbPromises).then(() =>
						db
							.insert(message)
							.values(messages)
							.onConflictDoNothing({ target: message.id })
					)
				: // For existing chats, insert immediately
					db
						.insert(message)
						.values(messages)
						.onConflictDoNothing({ target: message.id });

			// Update context in DB if provided (for existing chats)
			if (lastContext && !isNewChat) {
				dbPromises.push(
					db
						.update(chat)
						.set({ lastContext, updatedAt: new Date() })
						.where(eq(chat.id, chatId))
				);
			}

			// Optimized cache update (runs in parallel with DB operations)
			const cachePromise = isRedisAvailable()
				? (async () => {
						if (isNewChat && title && visibility) {
							// For new chats, create with messages in one operation
							// Pass isNewChat to skip redundant existence check
							await createOrUpdateChatWithMessages({
								chatId,
								userId: ctx.userId,
								title,
								visibility,
								messages: cachedMessages,
								lastContext,
								createdAt,
								_isNewChat: true,
							});
						} else {
							// For existing chats, use batch update
							await batchUpdateChatCache({
								chatId,
								userId: ctx.userId,
								messages: cachedMessages,
								lastContext,
								title,
							});
						}
					})()
				: Promise.resolve();

			// Wait for all operations to complete
			await Promise.all([
				messageInsertPromise,
				...dbPromises,
				cachePromise,
			]);

			// OPTIMIZATION: Increment quota counter for user messages (fire-and-forget)
			// Only count user messages (not assistant responses)
			const userMessageCount = messages.filter(
				(msg) => msg.role === "user"
			).length;
			if (userMessageCount > 0) {
				// Increment quota async (don't block on this)
				incrementUserMessageCountAsync(ctx.userId, userMessageCount);
			}

			return;
		} catch (error) {
			throw toDatabaseError(
				"save_messages_and_context",
				error,
				"Failed to save messages and context"
			);
		}
	},

	/**
	 * Delete messages after a specific timestamp
	 * Used for message regeneration and chat editing
	 *
	 * @param chatId Chat UUID
	 * @param timestamp Delete messages at or after this timestamp
	 * @param ctx Data context (userId, isGuest)
	 */
	deleteAfterTimestamp: async (
		chatId: string,
		timestamp: Date,
		ctx: DataContext
	): Promise<void> => {
		try {
			// Run cache and DB deletes in parallel
			const cachePromise = isRedisAvailable()
				? deleteMessagesFromCacheAfterTimestamp(
						chatId,
						ctx.userId,
						timestamp
					)
				: Promise.resolve();

			const dbPromise = ctx.isGuest
				? Promise.resolve()
				: (async () => {
						const messagesToDelete = await db
							.select({ id: message.id })
							.from(message)
							.where(
								and(
									eq(message.chatId, chatId),
									gte(message.createdAt, timestamp)
								)
							);

						const messageIds = messagesToDelete.map(
							(msgRec) => msgRec.id
						);

						if (messageIds.length > 0) {
							await db
								.delete(vote)
								.where(
									and(
										eq(vote.chatId, chatId),
										inArray(vote.messageId, messageIds)
									)
								);

							await db
								.delete(message)
								.where(
									and(
										eq(message.chatId, chatId),
										inArray(message.id, messageIds)
									)
								);
						}
					})();

			await Promise.all([cachePromise, dbPromise]);
		} catch (error) {
			throw toDatabaseError(
				"delete_messages_after_timestamp",
				error,
				"Failed to delete messages by chat id after timestamp"
			);
		}
	},
};
