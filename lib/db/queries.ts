import "server-only";

import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	gte,
	inArray,
	lt,
	type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import {
	appendDocumentVersionToCache,
	appendMessagesToCache,
	chatToCache,
	deleteChatFromCache,
	deleteDocumentVersionsFromCacheAfterTimestamp,
	deleteMessagesFromCacheAfterTimestamp,
	getChatFromCache,
	getDocumentFromCache,
	setChatInCache,
	updateChatLastContextInCache,
	updateChatTitleInCache,
	updateChatVisibilityInCache,
	warmChatCache,
	warmDocumentCache,
} from "../cache/operations";
import { isRedisAvailable } from "../cache/redis";
import type { CachedMessage } from "../cache/types";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import { generateUUID } from "../utils";
import {
	type Chat,
	chat,
	type DBMessage,
	document,
	message,
	type Suggestion,
	suggestion,
	type User,
	user,
	vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// Environment-aware PostgreSQL pool configuration
if (!process.env.POSTGRES_URL) {
	throw new Error("POSTGRES_URL environment variable is not set");
}

// Optimize pool size based on deployment environment
const getPoolConfig = () => {
	const isProduction = process.env.NODE_ENV === "production";
	const isVercelFluid = process.env.VERCEL_FLUID === "1";

	if (isVercelFluid) {
		// Vercel Fluid Compute: optimize for rapid scaling
		return { max: 5, idle_timeout: 10 };
	}
	if (isProduction) {
		// Traditional serverless: moderate pooling
		return { max: 10, idle_timeout: 20 };
	}
	// Development: minimal pooling
	return { max: 3, idle_timeout: 30 };
};

const poolConfig = getPoolConfig();
const client = postgres(process.env.POSTGRES_URL, {
	...poolConfig,
	connect_timeout: 10,
	prepare: false, // Better for serverless environments
});
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
	try {
		return await db
			.select()
			.from(user)
			.where(eq(user.email, email.toLowerCase()));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get user by email"
		);
	}
}

export async function createUser(email: string, password: string) {
	const passwordHash = generateHashedPassword(password);

	try {
		return await db
			.insert(user)
			.values({ email: email.toLowerCase(), passwordHash });
	} catch (_error) {
		throw new ChatSDKError("bad_request:database", "Failed to create user");
	}
}

export async function createGuestUser() {
	const email = `guest-${Date.now()}`;
	const passwordHash = generateHashedPassword(generateUUID());

	try {
		return await db
			.insert(user)
			.values({ email: email.toLowerCase(), passwordHash })
			.returning({
				id: user.id,
				email: user.email,
			});
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create guest user"
		);
	}
}

export async function saveChat({
	id,
	userId,
	title,
	visibility,
	skipCache = false,
}: {
	id: string;
	userId: string;
	title: string;
	visibility: VisibilityType;
	skipCache?: boolean;
}) {
	try {
		const now = new Date();
		const chatData = {
			id,
			createdAt: now,
			userId,
			title,
			visibility,
			updatedAt: now,
			lastContext: null,
		};

		// Write to DB
		const dbPromise = db.insert(chat).values(chatData);

		// Optionally skip cache (will be created later with messages)
		const cachePromise =
			!skipCache && isRedisAvailable()
				? setChatInCache(id, userId, chatToCache(chatData as Chat, []))
				: Promise.resolve();

		await Promise.all([dbPromise, cachePromise]);
		return chatData;
	} catch (_error) {
		throw new ChatSDKError("bad_request:database", "Failed to save chat");
	}
}

export async function deleteChatById({ id }: { id: string }) {
	try {
		// Get chat first to get userId for cache deletion
		const selectedChat = await getChatById({ id });

		await db.delete(vote).where(eq(vote.chatId, id));
		await db.delete(message).where(eq(message.chatId, id));

		const dbPromise = db.delete(chat).where(eq(chat.id, id)).returning();

		// Delete from cache in parallel
		const cachePromise =
			isRedisAvailable() && selectedChat
				? deleteChatFromCache(id, selectedChat.userId)
				: Promise.resolve();

		const [result] = await Promise.all([dbPromise, cachePromise]);
		return result[0];
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete chat by id"
		);
	}
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
	try {
		const userChats = await db
			.select({ id: chat.id })
			.from(chat)
			.where(eq(chat.userId, userId));

		if (userChats.length === 0) {
			return { deletedCount: 0 };
		}

		const chatIds = userChats.map((c) => c.id);

		await db.delete(vote).where(inArray(vote.chatId, chatIds));
		await db.delete(message).where(inArray(message.chatId, chatIds));

		const deletedChats = await db
			.delete(chat)
			.where(eq(chat.userId, userId))
			.returning();

		return { deletedCount: deletedChats.length };
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete all chats by user id"
		);
	}
}

export async function getChatsByUserId({
	id,
	limit,
	startingAfter,
	endingBefore,
}: {
	id: string;
	limit: number;
	startingAfter: string | null;
	endingBefore: string | null;
}) {
	try {
		const extendedLimit = limit + 1;

		const query = (whereCondition?: SQL<any>) =>
			db
				.select()
				.from(chat)
				.where(
					whereCondition
						? and(whereCondition, eq(chat.userId, id))
						: eq(chat.userId, id)
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
			chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
			hasMore,
		};
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get chats by user id"
		);
	}
}

export async function getChatById({
	id,
	userId,
}: {
	id: string;
	userId?: string;
}) {
	try {
		// Try cache first if userId is provided
		if (userId && isRedisAvailable()) {
			const cached = await getChatFromCache(id, userId);
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

		// Cache miss - fetch from database
		const [selectedChat] = await db
			.select()
			.from(chat)
			.where(eq(chat.id, id));
		if (!selectedChat) {
			return null;
		}

		// Warm cache in background if userId provided
		if (userId && isRedisAvailable() && selectedChat.userId === userId) {
			// Fetch messages for cache warming (don't block)
			getMessagesByChatId({ id })
				.then((messages) => {
					warmChatCache(
						id,
						userId,
						selectedChat,
						messages as DBMessage[]
					);
				})
				.catch((err) => console.error("Cache warming failed:", err));
		}

		return selectedChat;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get chat by id"
		);
	}
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
	try {
		const dbPromise = db
			.insert(message)
			.values(messages)
			.onConflictDoNothing({ target: message.id });

		// Update cache in parallel - use bulk operation
		const cachePromises: Promise<void>[] = [];
		if (isRedisAvailable() && messages.length > 0) {
			// OPTIMIZATION: Batch fetch all unique chats before processing messages
			// Eliminates N+1 query pattern (was O(n) sequential queries, now 1 parallel batch)
			const uniqueChatIds = [
				...new Set(messages.map((m) => m.chatId).filter(Boolean)),
			];

			// Fetch all chats in parallel
			const chatResults = await Promise.all(
				uniqueChatIds.map((chatId) => getChatById({ id: chatId }))
			);

			// Build lookup map for O(1) access
			const chatsMap = new Map<string, { userId: string }>();
			uniqueChatIds.forEach((chatId, index) => {
				const fetchedChat = chatResults[index];
				if (fetchedChat) {
					chatsMap.set(chatId, { userId: fetchedChat.userId });
				}
			});

			// Group messages by chatId using pre-fetched chat data
			const messagesByChatId = new Map<
				string,
				{ userId: string; messages: CachedMessage[] }
			>();

			for (const msg of messages) {
				if (!msg.chatId) {
					continue;
				}

				const chatData = chatsMap.get(msg.chatId);
				if (!chatData) {
					continue;
				}

				if (!messagesByChatId.has(msg.chatId)) {
					messagesByChatId.set(msg.chatId, {
						userId: chatData.userId,
						messages: [],
					});
				}

				const msgGroup = messagesByChatId.get(msg.chatId);
				if (msgGroup) {
					msgGroup.messages.push({
						id: msg.id || "",
						chatId: msg.chatId,
						role: msg.role,
						parts: msg.parts as any,
						attachments: (msg.attachments || []) as any[],
						createdAt: msg.createdAt
							? msg.createdAt.toISOString()
							: new Date().toISOString(),
					});
				}
			}

			// Bulk append for each chat
			for (const [chatId, data] of messagesByChatId.entries()) {
				cachePromises.push(
					appendMessagesToCache(chatId, data.userId, data.messages)
				);
			}
		}

		await Promise.all([dbPromise, ...cachePromises]);
		return;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to save messages"
		);
	}
}

/**
 * Optimized version that batches messages and context update in a single cache operation
 * Reduces cache operations from ~6 to ~2 (GET + SET)
 */
export async function saveMessagesAndContext({
	messages,
	userId,
	chatId,
	lastContext,
	isNewChat,
	title,
	visibility,
	createdAt,
}: {
	messages: DBMessage[];
	userId: string;
	chatId: string;
	lastContext?: AppUsage;
	isNewChat?: boolean;
	title?: string;
	visibility?: VisibilityType;
	createdAt?: Date;
}) {
	try {
		// Save messages to DB
		const dbPromises: Promise<any>[] = [
			db
				.insert(message)
				.values(messages)
				.onConflictDoNothing({ target: message.id }),
		];

		// Update context in DB if provided
		if (lastContext) {
			dbPromises.push(
				db
					.update(chat)
					.set({ lastContext, updatedAt: new Date() })
					.where(eq(chat.id, chatId))
			);
		}

		// Optimized cache update
		const cachePromise = isRedisAvailable()
			? (async () => {
					const cachedMessages: CachedMessage[] = messages.map(
						(msg) => ({
							id: msg.id || "",
							chatId: msg.chatId,
							role: msg.role,
							parts: msg.parts as any,
							attachments: (msg.attachments || []) as any[],
							createdAt: msg.createdAt
								? msg.createdAt.toISOString()
								: new Date().toISOString(),
						})
					);

					if (isNewChat && title && visibility) {
						// For new chats, create with messages in one operation
						const { createOrUpdateChatWithMessages } = await import(
							"../cache/batch-operations"
						);
						await createOrUpdateChatWithMessages({
							chatId,
							userId,
							title,
							visibility,
							messages: cachedMessages,
							lastContext,
							createdAt,
						});
					} else {
						// For existing chats, use batch update
						const { batchUpdateChatCache } = await import(
							"../cache/batch-operations"
						);
						await batchUpdateChatCache({
							chatId,
							userId,
							messages: cachedMessages,
							lastContext,
							title,
						});
					}
				})()
			: Promise.resolve();

		await Promise.all([...dbPromises, cachePromise]);
		return;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to save messages and context"
		);
	}
}

export async function getMessagesByChatId({
	id,
	userId,
}: {
	id: string;
	userId?: string;
}) {
	try {
		// Try cache first if userId provided
		if (userId && isRedisAvailable()) {
			const cached = await getChatFromCache(id, userId);
			if (cached) {
				// Return messages from cached denormalized structure
				return cached.messages.map((msg) => ({
					id: msg.id,
					chatId: msg.chatId,
					role: msg.role,
					parts: msg.parts,
					attachments: msg.attachments,
					createdAt: new Date(msg.createdAt),
				}));
			}
		}

		// Cache miss - fetch from database
		return await db
			.select()
			.from(message)
			.where(eq(message.chatId, id))
			.orderBy(asc(message.createdAt));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get messages by chat id"
		);
	}
}

export async function voteMessage({
	chatId,
	messageId,
	type,
	userId,
}: {
	chatId: string;
	messageId: string;
	type: "up" | "down";
	userId: string;
}) {
	try {
		const [existingVote] = await db
			.select()
			.from(vote)
			.where(
				and(
					eq(vote.chatId, chatId),
					eq(vote.messageId, messageId),
					eq(vote.userId, userId)
				)
			);

		if (existingVote) {
			return await db
				.update(vote)
				.set({ isUpvoted: type === "up" })
				.where(
					and(
						eq(vote.chatId, chatId),
						eq(vote.messageId, messageId),
						eq(vote.userId, userId)
					)
				);
		}
		return await db.insert(vote).values({
			chatId,
			messageId,
			userId,
			isUpvoted: type === "up",
		});
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to vote message"
		);
	}
}

export async function getVotesByChatId({ id }: { id: string }) {
	try {
		return await db.select().from(vote).where(eq(vote.chatId, id));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get votes by chat id"
		);
	}
}

export async function getVotesByChatIdAndUserId({
	chatId,
	userId,
}: {
	chatId: string;
	userId: string;
}) {
	try {
		return await db
			.select()
			.from(vote)
			.where(and(eq(vote.chatId, chatId), eq(vote.userId, userId)));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get votes by chat id and user id"
		);
	}
}

export async function saveDocument({
	id,
	chatId,
	title,
	kind,
	content,
	userId,
	isGuest = false,
}: {
	id: string;
	chatId: string;
	title: string;
	kind: ArtifactKind;
	content: string;
	userId: string;
	isGuest?: boolean;
}) {
	try {
		const createdAt = new Date();

		if (isGuest) {
			// Guest users: cache-only, no database write
			if (isRedisAvailable()) {
				await appendDocumentVersionToCache(
					id,
					userId,
					{
						title,
						content,
						kind,
						createdAt: createdAt.toISOString(),
						updatedAt: createdAt.toISOString(),
					},
					{ chatId }
				);
			}

			// Return mock document object for guest
			return [
				{
					id,
					chatId,
					title,
					kind,
					content,
					userId,
					createdAt,
				},
			];
		}

		// Authenticated users: save to both DB and cache
		const dbPromise = db
			.insert(document)
			.values({
				id,
				chatId,
				title,
				kind,
				content,
				userId,
				createdAt,
			})
			.returning();

		// Update cache in parallel
		const cachePromise = isRedisAvailable()
			? appendDocumentVersionToCache(
					id,
					userId,
					{
						title,
						content,
						kind,
						createdAt: createdAt.toISOString(),
						updatedAt: createdAt.toISOString(),
					},
					{ chatId }
				)
			: Promise.resolve();

		const [dbResult] = await Promise.allSettled([dbPromise, cachePromise]);

		if (dbResult.status === "rejected") {
			console.warn(
				"saveDocument: DB write failed, cache updated",
				dbResult.reason
			);
			// Graceful degradation: return undefined to avoid tool failure
			return undefined as any;
		}

		return dbResult.value;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to save document"
		);
	}
}

export async function getDocumentsById({
	id,
	userId,
	isGuest = false,
}: {
	id: string;
	userId?: string;
	isGuest?: boolean;
}) {
	try {
		// Try cache first if userId provided
		if (userId && isRedisAvailable()) {
			const cached = await getDocumentFromCache(id, userId);
			if (cached && cached.versions.length > 0) {
				// Return cached data (for both guests and authenticated users)
				return cached.versions.map((v) => ({
					id: cached.id,
					userId: cached.userId,
					chatId: cached.chatId,
					title: v.title,
					content: v.content,
					kind: v.kind,
					createdAt: new Date(v.createdAt),
				}));
			}
		}

		// Guest users: cache-only, return empty if not in cache
		if (isGuest) {
			return [];
		}

		// Authenticated users: fallback to database
		const documents = await db
			.select()
			.from(document)
			.where(eq(document.id, id))
			.orderBy(asc(document.createdAt));

		// Warm cache in background
		if (userId && isRedisAvailable() && documents.length > 0) {
			warmDocumentCache(id, userId, documents as any).catch(
				console.error
			);
		}

		return documents;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get documents by id"
		);
	}
}

export async function getDocumentById({
	id,
	userId,
	isGuest = false,
}: {
	id: string;
	userId?: string;
	isGuest?: boolean;
}) {
	try {
		// Try cache first if userId provided
		if (userId && isRedisAvailable()) {
			const cached = await getDocumentFromCache(id, userId);
			if (cached && cached.versions.length > 0) {
				const latestVersion = cached.versions.at(-1);
				if (latestVersion) {
					// Return cached data (for both guests and authenticated users)
					return {
						id: cached.id,
						userId: cached.userId,
						chatId: cached.chatId,
						title: latestVersion.title,
						content: latestVersion.content,
						kind: latestVersion.kind,
						createdAt: new Date(latestVersion.createdAt),
						updatedAt: new Date(latestVersion.updatedAt),
					};
				}
			}
		}

		// Guest users: cache-only, return null if not in cache
		if (isGuest) {
			return null;
		}

		// Authenticated users: fallback to database
		const [selectedDocument] = await db
			.select()
			.from(document)
			.where(eq(document.id, id))
			.orderBy(desc(document.createdAt));

		// Warm cache in background
		if (userId && isRedisAvailable() && selectedDocument) {
			db.select()
				.from(document)
				.where(eq(document.id, id))
				.orderBy(asc(document.createdAt))
				.then((docs) => warmDocumentCache(id, userId, docs as any))
				.catch(console.error);
		}

		return selectedDocument;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get document by id"
		);
	}
}

export async function deleteDocumentsByIdAfterTimestamp({
	id,
	timestamp,
	userId,
	isGuest = false,
}: {
	id: string;
	timestamp: Date;
	userId?: string;
	isGuest?: boolean;
}) {
	try {
		if (isGuest) {
			// Guest users: cache-only deletion, no database
			if (userId && isRedisAvailable()) {
				await deleteDocumentVersionsFromCacheAfterTimestamp(
					id,
					userId,
					timestamp
				);
			}
			// Return empty array (no DB records to return for guests)
			return [];
		}

		// Authenticated users: delete from both DB and cache
		await db
			.delete(suggestion)
			.where(
				and(
					eq(suggestion.documentId, id),
					gt(suggestion.documentCreatedAt, timestamp)
				)
			);

		const result = await db
			.delete(document)
			.where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
			.returning();

		// Also delete from cache if userId provided
		if (userId && isRedisAvailable()) {
			await deleteDocumentVersionsFromCacheAfterTimestamp(
				id,
				userId,
				timestamp
			);
		}

		return result;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete documents by id after timestamp"
		);
	}
}

export async function saveSuggestions({
	suggestions,
}: {
	suggestions: Suggestion[];
}) {
	try {
		return await db.insert(suggestion).values(suggestions);
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to save suggestions"
		);
	}
}

export async function getSuggestionsByDocumentId({
	documentId,
}: {
	documentId: string;
}) {
	try {
		return await db
			.select()
			.from(suggestion)
			.where(and(eq(suggestion.documentId, documentId)));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get suggestions by document id"
		);
	}
}

export async function getMessageById({ id }: { id: string }) {
	try {
		return await db.select().from(message).where(eq(message.id, id));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get message by id"
		);
	}
}

export async function deleteMessagesByChatIdAfterTimestamp({
	chatId,
	timestamp,
	userId,
}: {
	chatId: string;
	timestamp: Date;
	userId?: string;
}) {
	try {
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
			(currentMessage) => currentMessage.id
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

			const result = await db
				.delete(message)
				.where(
					and(
						eq(message.chatId, chatId),
						inArray(message.id, messageIds)
					)
				);

			// Also delete from cache if userId provided
			if (userId && isRedisAvailable()) {
				await deleteMessagesFromCacheAfterTimestamp(
					chatId,
					userId,
					timestamp
				);
			}

			return result;
		}
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete messages by chat id after timestamp"
		);
	}
}

export async function updateChatVisiblityById({
	chatId,
	visibility,
}: {
	chatId: string;
	visibility: "private" | "public";
}) {
	try {
		const dbPromise = db
			.update(chat)
			.set({ visibility, updatedAt: new Date() })
			.where(eq(chat.id, chatId));

		// Update cache in parallel
		// Optimized: only fetch userId field instead of full chat object
		const cachePromise = isRedisAvailable()
			? (async () => {
					const [chatUser] = await db
						.select({ userId: chat.userId })
						.from(chat)
						.where(eq(chat.id, chatId))
						.limit(1);

					if (chatUser) {
						return updateChatVisibilityInCache(
							chatId,
							chatUser.userId,
							visibility
						);
					}
				})()
			: Promise.resolve();

		await Promise.all([dbPromise, cachePromise]);
		return;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update chat visibility by id"
		);
	}
}

export async function updateChatTitleById({
	chatId,
	title,
}: {
	chatId: string;
	title: string;
}) {
	try {
		const dbPromise = db
			.update(chat)
			.set({ title, updatedAt: new Date() })
			.where(eq(chat.id, chatId));

		// Update cache in parallel
		// Optimized: only fetch userId field instead of full chat object
		const cachePromise = isRedisAvailable()
			? (async () => {
					const [chatUser] = await db
						.select({ userId: chat.userId })
						.from(chat)
						.where(eq(chat.id, chatId))
						.limit(1);

					if (chatUser) {
						return updateChatTitleInCache(
							chatId,
							chatUser.userId,
							title
						);
					}
				})()
			: Promise.resolve();

		await Promise.all([dbPromise, cachePromise]);
		return;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update chat title by id"
		);
	}
}

export async function updateChatLastContextById({
	chatId,
	context,
}: {
	chatId: string;
	// Store merged server-enriched usage object
	context: AppUsage;
}) {
	try {
		const dbPromise = db
			.update(chat)
			.set({ lastContext: context, updatedAt: new Date() })
			.where(eq(chat.id, chatId));

		// Update cache in parallel
		const cachePromise = isRedisAvailable()
			? getChatById({ id: chatId }).then((selectedChat) => {
					if (selectedChat) {
						return updateChatLastContextInCache(
							chatId,
							selectedChat.userId,
							context
						);
					}
					return Promise.resolve();
				})
			: Promise.resolve();

		await Promise.all([dbPromise, cachePromise]);
		return;
	} catch (error) {
		console.warn("Failed to update lastContext for chat", chatId, error);
		return;
	}
}

export async function getMessageCountByUserId({
	id,
	differenceInHours,
}: {
	id: string;
	differenceInHours: number;
}) {
	try {
		const twentyFourHoursAgo = new Date(
			Date.now() - differenceInHours * 60 * 60 * 1000
		);

		const [stats] = await db
			.select({ count: count(message.id) })
			.from(message)
			.innerJoin(chat, eq(message.chatId, chat.id))
			.where(
				and(
					eq(chat.userId, id),
					gte(message.createdAt, twentyFourHoursAgo),
					eq(message.role, "user")
				)
			)
			.execute();

		return stats?.count ?? 0;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get message count by user id"
		);
	}
}
