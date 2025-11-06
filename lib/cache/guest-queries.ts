import "server-only";

import type { VisibilityType } from "@/components/visibility-selector";
import type { DBMessage } from "../db/schema";
import type { AppUsage } from "../usage";
import {
	appendMessagesToCache,
	chatToCache,
	deleteChatFromCache,
	getChatFromCache,
	setChatInCache,
	updateChatLastContextInCache,
	updateChatTitleInCache,
	updateChatVisibilityInCache,
} from "./operations";
import type { CachedMessage } from "./types";

/**
 * Guest user operations - cache-only, no database persistence
 * Data exists only in Redis with optional TTL for cleanup
 */

export async function saveGuestChat({
	id,
	userId,
	title,
	visibility,
}: {
	id: string;
	userId: string;
	title: string;
	visibility: VisibilityType;
}) {
	const now = new Date();
	const chatData = {
		id,
		userId,
		title,
		visibility,
		createdAt: now,
		updatedAt: now,
		lastContext: null,
	};

	// For guests, only write to cache (with TTL for cleanup)
	await setChatInCache(id, userId, chatToCache(chatData as any, []));
}

export async function saveGuestMessages({
	messages,
	userId,
}: {
	messages: DBMessage[];
	userId: string;
}) {
	// For guests, only write to cache - use bulk operation
	if (messages.length === 0) {
		return;
	}

	// Group messages by chatId
	const messagesByChatId = new Map<string, CachedMessage[]>();
	for (const msg of messages) {
		if (!msg.chatId) {
			continue;
		}
		
		const cachedMsg: CachedMessage = {
			id: msg.id || "",
			chatId: msg.chatId,
			role: msg.role,
			parts: msg.parts as any,
			attachments: (msg.attachments || []) as any[],
			createdAt: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString(),
		};
		
		if (!messagesByChatId.has(msg.chatId)) {
			messagesByChatId.set(msg.chatId, []);
		}
		const chatMessages = messagesByChatId.get(msg.chatId);
		if (chatMessages) {
			chatMessages.push(cachedMsg);
		}
	}

	// Bulk append for each chat (single cache operation per chat)
	const cachePromises = Array.from(messagesByChatId.entries()).map(
		([chatId, msgs]) => appendMessagesToCache(chatId, userId, msgs)
	);

	await Promise.all(cachePromises);
}

/**
 * Optimized version that batches messages and context update in a single cache operation
 */
export async function saveGuestMessagesAndContext({
	messages,
	userId,
	chatId,
	lastContext,
	isNewChat,
	title,
	visibility,
}: {
	messages: DBMessage[];
	userId: string;
	chatId: string;
	lastContext?: any;
	isNewChat?: boolean;
	title?: string;
	visibility?: VisibilityType;
}) {
	// Convert messages to cached format
	const cachedMessages: CachedMessage[] = messages.map((msg) => ({
		id: msg.id || "",
		chatId: msg.chatId,
		role: msg.role,
		parts: msg.parts as any,
		attachments: (msg.attachments || []) as any[],
		createdAt: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString(),
	}));

	if (isNewChat && title && visibility) {
		// For new chats, create with messages in one operation
		const { createOrUpdateChatWithMessages } = await import("./batch-operations");
		await createOrUpdateChatWithMessages({
			chatId,
			userId,
			title,
			visibility,
			messages: cachedMessages,
			lastContext,
		});
	} else {
		// For existing chats, use batch update
		const { batchUpdateChatCache } = await import("./batch-operations");
		await batchUpdateChatCache({
			chatId,
			userId,
			messages: cachedMessages,
			lastContext,
			title,
		});
	}
}

export async function getGuestChatById({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	const cached = await getChatFromCache(id, userId);
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
}

export async function getGuestMessagesByChatId({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	const cached = await getChatFromCache(id, userId);
	if (!cached) {
		return [];
	}

	return cached.messages.map((msg) => ({
		id: msg.id,
		chatId: msg.chatId,
		role: msg.role,
		parts: msg.parts,
		attachments: msg.attachments,
		createdAt: new Date(msg.createdAt),
	}));
}

export async function updateGuestChatTitleById({
	chatId,
	userId,
	title,
}: {
	chatId: string;
	userId: string;
	title: string;
}) {
	await updateChatTitleInCache(chatId, userId, title);
}

export async function updateGuestChatLastContextById({
	chatId,
	userId,
	context,
}: {
	chatId: string;
	userId: string;
	context: AppUsage;
}) {
	await updateChatLastContextInCache(chatId, userId, context);
}

export async function updateGuestChatVisibilityById({
	chatId,
	userId,
	visibility,
}: {
	chatId: string;
	userId: string;
	visibility: VisibilityType;
}) {
	await updateChatVisibilityInCache(chatId, userId, visibility);
}

export async function deleteGuestChatById({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	await deleteChatFromCache(id, userId);
}

export async function getGuestChatsByUserId({
	id,
	limit,
	startingAfter: _startingAfter,
	endingBefore: _endingBefore,
}: {
	id: string;
	limit: number;
	startingAfter: string | null;
	endingBefore: string | null;
}) {
	const { getUserChatsFromCache } = await import("./operations");
	
	// TODO: Implement cursor-based pagination using _startingAfter/_endingBefore
	// For now, simple offset-based pagination
	const offset = 0;
	const extendedLimit = limit + 1;
	
	const chatList = await getUserChatsFromCache(id, extendedLimit, offset);
	
	// OPTIMIZATION: Batch fetch with MGET instead of N+1 pattern
	const { getRedisClient } = await import("./redis");
	const { CacheKeys } = await import("./types");
	const redis = getRedisClient();
	
	if (!redis || chatList.length === 0) {
		return { chats: [], hasMore: false };
	}
	
	// Batch fetch all chats in single MGET operation
	const cacheKeys = chatList.map(item => CacheKeys.chat(item.chatId, id));
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
		.filter((c): c is NonNullable<typeof c> => {
			return c !== null;
		});
	
	const validChats = chats.filter((c) => c !== null);
	const hasMore = validChats.length > limit;
	
	return {
		chats: hasMore ? validChats.slice(0, limit) : validChats,
		hasMore,
	};
}

export async function deleteAllGuestChatsByUserId({
	userId,
}: {
	userId: string;
}) {
	const { getUserChatsFromCache } = await import("./operations");
	
	// Get all chats for this user (use large limit to get all)
	const chatList = await getUserChatsFromCache(userId, 1000, 0);
	
	// Delete each chat from cache
	const deletePromises = chatList.map((item) =>
		deleteChatFromCache(item.chatId, userId)
	);
	
	await Promise.all(deletePromises);
	
	return { deletedCount: chatList.length };
}
