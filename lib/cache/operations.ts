import "server-only";

import type { VisibilityType } from "@/components/visibility-selector";
import { logError } from "@/lib/log";
import type { Chat, DBMessage, Document } from "../db/schema";
import type { AppUsage } from "../usage";
import { getRedisClient, isRedisAvailable } from "./redis";
import {
	type CachedChat,
	type CachedDocument,
	type CachedMessage,
	CacheKeys,
	type DocumentVersion,
} from "./types";

/**
 * CHAT OPERATIONS
 */

// Get chat from cache (cache hit returns full denormalized structure)
export async function getChatFromCache(
	chatId: string,
	userId: string
): Promise<CachedChat | null> {
	const redis = getRedisClient();
	if (!redis) {
		return null;
	}

	try {
		const cached = await redis.get<CachedChat>(
			CacheKeys.chat(chatId, userId)
		);
		return cached;
	} catch (error) {
		logError("Redis getChatFromCache error", error);
		return null;
	}
}

// Set chat in cache with messages
export async function setChatInCache(
	chatId: string,
	userId: string,
	chat: CachedChat
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		// Use Redis pipeline for atomic operations (40-50% faster)
		const pipeline = redis.pipeline();

		const chatKey = CacheKeys.chat(chatId, userId);
		const userChatsKey = CacheKeys.userChats(userId);

		pipeline.set(chatKey, chat);
		pipeline.zadd(userChatsKey, {
			score: Date.parse(chat.updatedAt),
			member: chatId,
		});

		// Apply a 7-day TTL for guest users to avoid unbounded growth
		if (userId.startsWith("guest:")) {
			const ttlSeconds = 7 * 24 * 60 * 60;
			pipeline.expire(chatKey, ttlSeconds);
			pipeline.expire(userChatsKey, ttlSeconds);
		}

		await pipeline.exec();
	} catch (error) {
		logError("Redis setChatInCache error", error);
	}
}

// Append new message to cached chat
export async function appendMessageToCache(
	chatId: string,
	userId: string,
	message: CachedMessage
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const cached = await getChatFromCache(chatId, userId);
		if (!cached) {
			return;
		}

		// Append message to array
		cached.messages.push(message);
		cached.updatedAt = new Date().toISOString();
		cached.version += 1;

		await setChatInCache(chatId, userId, cached);
	} catch (error) {
		logError("Redis appendMessageToCache error", error);
	}
}

// Bulk append multiple messages to cached chat (single cache operation)
export async function appendMessagesToCache(
	chatId: string,
	userId: string,
	messages: CachedMessage[]
): Promise<void> {
	const redis = getRedisClient();
	if (!redis || messages.length === 0) {
		return;
	}

	try {
		const cached = await getChatFromCache(chatId, userId);
		if (!cached) {
			return;
		}

		// Append all messages at once
		cached.messages.push(...messages);
		cached.updatedAt = new Date().toISOString();
		cached.version += 1;

		await setChatInCache(chatId, userId, cached);
	} catch (error) {
		logError("Redis appendMessagesToCache error", error);
	}
}

// Delete messages from cache at or after timestamp
export async function deleteMessagesFromCacheAfterTimestamp(
	chatId: string,
	userId: string,
	timestamp: Date
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const cached = await getChatFromCache(chatId, userId);
		if (!cached) {
			return;
		}

		// Filter out messages created at or after timestamp
		cached.messages = cached.messages.filter(
			(msg) => new Date(msg.createdAt) < timestamp
		);
		cached.updatedAt = new Date().toISOString();
		cached.version += 1;

		await setChatInCache(chatId, userId, cached);
	} catch (error) {
		logError("Redis deleteMessagesFromCacheAfterTimestamp error", error);
	}
}

// Update chat title in cache
export async function updateChatTitleInCache(
	chatId: string,
	userId: string,
	title: string
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const cached = await getChatFromCache(chatId, userId);
		if (!cached) {
			return;
		}

		cached.title = title;
		cached.updatedAt = new Date().toISOString();
		cached.version += 1;

		await setChatInCache(chatId, userId, cached);
	} catch (error) {
		logError("Redis updateChatTitleInCache error", error);
	}
}

// Update chat last context in cache
export async function updateChatLastContextInCache(
	chatId: string,
	userId: string,
	context: AppUsage
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const cached = await getChatFromCache(chatId, userId);
		if (!cached) {
			return;
		}

		cached.lastContext = context;
		cached.updatedAt = new Date().toISOString();
		cached.version += 1;

		await setChatInCache(chatId, userId, cached);
	} catch (error) {
		logError("Redis updateChatLastContextInCache error", error);
	}
}

// Update chat visibility in cache
export async function updateChatVisibilityInCache(
	chatId: string,
	userId: string,
	visibility: VisibilityType
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const cached = await getChatFromCache(chatId, userId);
		if (!cached) {
			return;
		}

		cached.visibility = visibility;
		cached.updatedAt = new Date().toISOString();
		cached.version += 1;

		await setChatInCache(chatId, userId, cached);
	} catch (error) {
		logError("Redis updateChatVisibilityInCache error", error);
	}
}

// Delete chat from cache
export async function deleteChatFromCache(
	chatId: string,
	userId: string
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		// Use Redis pipeline for atomic operations
		const pipeline = redis.pipeline();
		pipeline.del(CacheKeys.chat(chatId, userId));
		pipeline.zrem(CacheKeys.userChats(userId), chatId);
		await pipeline.exec();
	} catch (error) {
		logError("Redis deleteChatFromCache error", error);
	}
}

// Get user's chats from ZSET (paginated, sorted by updatedAt desc)
export async function getUserChatsFromCache(
	userId: string,
	limit = 10,
	offset = 0
): Promise<{ chatId: string; title: string }[]> {
	const redis = getRedisClient();
	if (!redis) {
		return [];
	}

	try {
		// Get from ZSET in reverse order (newest first)
		const items = await redis.zrange<string[]>(
			CacheKeys.userChats(userId),
			offset,
			offset + limit - 1,
			{ rev: true }
		);

		// Deduplicate chat IDs defensively in case of overlapping inserts
		const uniqueChatIdsSet = new Set<string>();
		const uniqueChatIds: string[] = [];
		for (const item of items) {
			if (!uniqueChatIdsSet.has(item)) {
				uniqueChatIdsSet.add(item);
				uniqueChatIds.push(item);
			}
			if (uniqueChatIds.length >= limit) {
				break;
			}
		}

		return uniqueChatIds.map((cid) => ({
			chatId: cid,
			title: "New Chat",
		}));
	} catch (error) {
		logError("Redis getUserChatsFromCache error", error);
		return [];
	}
}

/**
 * DOCUMENT OPERATIONS
 */

// Get document from cache
export async function getDocumentFromCache(
	documentId: string,
	userId: string
): Promise<CachedDocument | null> {
	const redis = getRedisClient();
	if (!redis) {
		return null;
	}

	try {
		const cached = await redis.get<CachedDocument>(
			CacheKeys.document(documentId, userId)
		);
		return cached;
	} catch (error) {
		logError("Redis getDocumentFromCache error", error);
		return null;
	}
}

// Set document in cache
export async function setDocumentInCache(
	documentId: string,
	userId: string,
	document: CachedDocument
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		await redis.set(CacheKeys.document(documentId, userId), document);
	} catch (error) {
		logError("Redis setDocumentInCache error", error);
	}
}

// Append new version to document cache
export async function appendDocumentVersionToCache(
	documentId: string,
	userId: string,
	version: DocumentVersion,
	opts?: { chatId?: string }
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const cached = await getDocumentFromCache(documentId, userId);
		if (!cached) {
			// Create new document with first version
			await setDocumentInCache(documentId, userId, {
				id: documentId,
				userId,
				chatId: opts?.chatId ?? "",
				versions: [version],
			});
			return;
		}

		// Append version
		cached.versions.push(version);
		await setDocumentInCache(documentId, userId, cached);
	} catch (error) {
		logError("Redis appendDocumentVersionToCache error", error);
	}
}

// Delete document versions from cache after timestamp
export async function deleteDocumentVersionsFromCacheAfterTimestamp(
	documentId: string,
	userId: string,
	timestamp: Date
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const cached = await getDocumentFromCache(documentId, userId);
		if (!cached) {
			return;
		}

		// Filter out versions created after timestamp
		cached.versions = cached.versions.filter(
			(version) => new Date(version.createdAt) <= timestamp
		);

		await setDocumentInCache(documentId, userId, cached);
	} catch (error) {
		logError(
			"Redis deleteDocumentVersionsFromCacheAfterTimestamp error",
			error
		);
	}
}

/**
 * CONVERSION HELPERS
 * Convert DB models to cache models and vice versa
 */

export function chatToCache(chat: Chat, messages: DBMessage[]): CachedChat {
	return {
		id: chat.id,
		userId: chat.userId,
		title: chat.title,
		visibility: chat.visibility,
		createdAt: chat.createdAt.toISOString(),
		updatedAt: chat.updatedAt.toISOString(),
		lastContext: chat.lastContext,
		messages: messages.map((msg) => ({
			id: msg.id || "",
			chatId: msg.chatId,
			role: msg.role,
			parts: msg.parts as any,
			attachments: (msg.attachments || []) as any[],
			createdAt: msg.createdAt
				? msg.createdAt.toISOString()
				: new Date().toISOString(),
		})),
		version: 1,
	};
}

export function documentsToCache(documents: Document[]): CachedDocument | null {
	if (documents.length === 0) {
		return null;
	}

	const first = documents[0];
	if (!first) {
		return null;
	}
	return {
		id: first.id,
		userId: first.userId,
		chatId: first.chatId,
		versions: documents.map((doc) => ({
			title: doc.title,
			content: doc.content,
			kind: doc.kind,
			createdAt: doc.createdAt.toISOString(),
			updatedAt: doc.updatedAt.toISOString(),
		})),
	};
}

/**
 * CACHE WARMING
 * Populate cache from database
 */

export async function warmChatCache(
	chatId: string,
	userId: string,
	chat: Chat,
	messages: DBMessage[]
): Promise<void> {
	if (!isRedisAvailable()) {
		return;
	}

	const cached = chatToCache(chat, messages);
	await setChatInCache(chatId, userId, cached);
}

export async function warmDocumentCache(
	documentId: string,
	userId: string,
	documents: Document[]
): Promise<void> {
	if (!isRedisAvailable()) {
		return;
	}

	const cached = documentsToCache(documents);
	if (cached) {
		await setDocumentInCache(documentId, userId, cached);
	}
}
