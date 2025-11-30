import "server-only";

import type { DBMessage } from "../db/schema";
import type { CachedMessage, MessageAttachment } from "./types";

/**
 * Convert a database message to cached message format
 * Centralizes the conversion logic to avoid duplication
 *
 * @param msg Database message
 * @returns Cached message format
 */
export function dbMessageToCachedMessage(msg: DBMessage): CachedMessage {
	// Ensure attachments is an array (jsonb column can be object or array)
	let attachments: MessageAttachment[];
	if (Array.isArray(msg.attachments)) {
		attachments = msg.attachments as MessageAttachment[];
	} else if (msg.attachments && typeof msg.attachments === "object") {
		attachments = [msg.attachments as MessageAttachment];
	} else {
		attachments = [];
	}

	return {
		id: msg.id || "",
		chatId: msg.chatId,
		role: msg.role,
		parts: msg.parts,
		attachments,
		createdAt: msg.createdAt
			? msg.createdAt.toISOString()
			: new Date().toISOString(),
	};
}

/**
 * Convert multiple database messages to cached format
 *
 * @param messages Array of database messages
 * @returns Array of cached messages
 */
export function dbMessagesToCachedMessages(
	messages: DBMessage[]
): CachedMessage[] {
	return messages.map(dbMessageToCachedMessage);
}

/**
 * Group messages by chat ID for batch operations
 *
 * @param messages Array of database messages
 * @returns Map of chatId to cached messages array
 */
export function groupMessagesByChatId(
	messages: DBMessage[]
): Map<string, CachedMessage[]> {
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

	return messagesByChatId;
}
