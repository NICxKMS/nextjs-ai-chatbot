import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import type { AppUsage } from "../usage";

// Re-export types needed by cache consumers
export type {
	MessageAttachment,
	MessagePart,
} from "../types/message-parts";

// Import for local use
import type { MessageAttachment, MessagePart } from "../types/message-parts";

// Denormalized chat structure for Redis
export type CachedChat = {
	// Chat metadata
	id: string;
	userId: string;
	title: string;
	visibility: VisibilityType;
	createdAt: string; // ISO string
	updatedAt: string; // ISO string
	lastContext: AppUsage | null;

	// Denormalized messages array (chronologically ordered)
	messages: CachedMessage[];

	// Version for optimistic locking
	version: number;
};

export type CachedMessage = {
	id: string;
	chatId: string;
	role: "user" | "assistant" | "system";
	parts: MessagePart[] | unknown; // JSON parts - can be array or other JSON
	attachments: MessageAttachment[]; // JSON attachments
	createdAt: string; // ISO string
};

// User chat list item for ZSET
export type UserChatListItem = {
	chatId: string;
	title: string;
	updatedAt: number; // Unix timestamp in ms (for ZSET score)
};

// Document with versions array
export type CachedDocument = {
	id: string;
	userId: string;
	chatId: string;
	versions: DocumentVersion[];
};

export type DocumentVersion = {
	title: string;
	content: string | null;
	kind: ArtifactKind;
	createdAt: string; // ISO string
	updatedAt: string; // ISO string
};

// Cache key patterns
export const CacheKeys = {
	// chat:{chatId}:{userId} - Full denormalized chat with messages
	chat: (chatId: string, userId: string) => `chat:${chatId}:${userId}`,

	// user:{userId}:chats - ZSET of chat IDs sorted by updatedAt
	userChats: (userId: string) => `user:${userId}:chats`,

	// document:{documentId}:{userId} - Document with all versions
	document: (documentId: string, userId: string) =>
		`document:${documentId}:${userId}`,
} as const;
