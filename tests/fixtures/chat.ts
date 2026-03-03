import type { Chat, Message } from "@/lib/types/models.types"

import { TEST_USER_ID } from "./user"

/**
 * Create a typed mock Chat entity with sensible defaults.
 * Supports override pattern: `createMockChat({ title: "My Chat" })`
 */
export function createMockChat(overrides?: Partial<Chat>): Chat {
	return {
		id: crypto.randomUUID(),
		createdAt: new Date("2026-01-01T00:00:00Z"),
		updatedAt: new Date("2026-01-01T00:00:00Z"),
		title: "Test Chat",
		userId: TEST_USER_ID,
		visibility: "private",
		model: "gpt-4o",
		...overrides,
	}
}

/**
 * Create a typed mock Message entity with sensible defaults.
 * Supports override pattern: `createMockMessage({ role: "assistant" })`
 */
export function createMockMessage(overrides?: Partial<Message>): Message {
	const chatId = overrides?.chatId ?? crypto.randomUUID()

	return {
		id: crypto.randomUUID(),
		chatId,
		role: "user",
		parts: [{ type: "text", text: "Hello, world!" }],
		attachments: [],
		createdAt: new Date("2026-01-01T00:00:00Z"),
		...overrides,
	}
}
