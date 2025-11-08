import "server-only";

import type { VisibilityType } from "@/components/visibility-selector";
import { logError } from "@/lib/log";
import type { AppUsage } from "../usage";
import { getChatFromCache, setChatInCache } from "./operations";
import { getRedisClient } from "./redis";
import type { CachedMessage } from "./types";

/**
 * Optimized batch operations to reduce cache round trips
 */

/**
 * Update chat with messages and context in a single cache operation
 * Reduces 2 GET + 2 SET operations down to 1 GET + 1 SET
 */
export async function batchUpdateChatCache({
	chatId,
	userId,
	messages,
	lastContext,
	title,
}: {
	chatId: string;
	userId: string;
	messages?: CachedMessage[];
	lastContext?: AppUsage;
	title?: string;
}): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const cached = await getChatFromCache(chatId, userId);
		if (!cached) {
			return;
		}

		// Apply all updates atomically
		if (messages && messages.length > 0) {
			cached.messages.push(...messages);
		}

		if (lastContext) {
			cached.lastContext = lastContext;
		}

		if (title) {
			cached.title = title;
		}

		cached.updatedAt = new Date().toISOString();
		cached.version += 1;

		await setChatInCache(chatId, userId, cached);
	} catch (error) {
		logError("Redis batchUpdateChatCache error", error);
	}
}

/**
 * Create or update chat with messages and metadata in a single operation
 * For new chats, skips empty chat creation and creates with first messages
 * Reduces operations from 3 (create + title + messages) to 1
 */
export async function createOrUpdateChatWithMessages({
	chatId,
	userId,
	title,
	visibility,
	messages,
	lastContext,
	createdAt,
}: {
	chatId: string;
	userId: string;
	title: string;
	visibility: VisibilityType;
	messages: CachedMessage[];
	lastContext?: AppUsage;
	createdAt?: Date;
}): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const cached = await getChatFromCache(chatId, userId);

		if (cached) {
			// Update existing chat
			if (messages.length > 0) {
				cached.messages.push(...messages);
			}
			if (lastContext) {
				cached.lastContext = lastContext;
			}
			if (title) {
				cached.title = title;
			}
			cached.updatedAt = new Date().toISOString();
			cached.version += 1;
			await setChatInCache(chatId, userId, cached);
		} else {
			// Create new chat with messages in one operation
			const now = new Date();
			await setChatInCache(chatId, userId, {
				id: chatId,
				userId,
				title,
				visibility,
				createdAt: createdAt
					? createdAt.toISOString()
					: now.toISOString(),
				updatedAt: now.toISOString(),
				lastContext: lastContext || null,
				messages,
				version: 1,
			});
		}
	} catch (error) {
		logError("Redis createOrUpdateChatWithMessages error", error);
	}
}
