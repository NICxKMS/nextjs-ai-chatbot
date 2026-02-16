/**
 * Database Mocks for Testing
 *
 * Provides mock implementations of database operations for unit tests.
 * Uses in-memory storage for fast, isolated test execution.
 *
 * @module src/test/mocks/db
 */

import { vi } from "vitest"
import type {
	Artifact,
	Chat,
	Message,
	NewArtifact,
	NewChat,
	NewMessage,
	NewUser,
	NewVote,
	User,
	Vote,
} from "@/lib/db/schema"

// =============================================================================
// In-Memory Storage
// =============================================================================

/**
 * In-memory database storage for tests
 * Can be reset between tests using resetMockDatabase()
 */
export const mockDatabase = {
	users: new Map<string, User>(),
	chats: new Map<string, Chat>(),
	messages: new Map<string, Message>(),
	votes: new Map<string, Vote>(),
	artifacts: new Map<string, Artifact>(),
}

// =============================================================================
// Mock Database Client
// =============================================================================

/**
 * Create a mock database client with all standard operations
 */
export function createMockDbClient() {
	return {
		// Query builder mock
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					limit: vi.fn(() => []),
					orderBy: vi.fn(() => []),
					execute: vi.fn(() => []),
				})),
				limit: vi.fn(() => []),
				orderBy: vi.fn(() => []),
				execute: vi.fn(() => []),
			})),
		})),

		// Insert mock
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: vi.fn(() => []),
				execute: vi.fn(() => undefined),
			})),
		})),

		// Update mock
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => ({
					returning: vi.fn(() => []),
					execute: vi.fn(() => undefined),
				})),
			})),
		})),

		// Delete mock
		delete: vi.fn(() => ({
			where: vi.fn(() => ({
				returning: vi.fn(() => []),
				execute: vi.fn(() => undefined),
			})),
		})),

		// Transaction mock
		transaction: vi.fn((fn: () => Promise<unknown>) => fn()),
	}
}

// =============================================================================
// Mock Repository Operations
// =============================================================================

/**
 * Mock user repository operations
 */
export const mockUserRepository = {
	findById: vi.fn(async (id: string): Promise<User | null> => {
		return mockDatabase.users.get(id) ?? null
	}),

	findByEmail: vi.fn(async (email: string): Promise<User | null> => {
		for (const user of mockDatabase.users.values()) {
			if (user.email === email) return user
		}
		return null
	}),

	create: vi.fn(async (data: NewUser): Promise<User> => {
		const user: User = {
			id: crypto.randomUUID(),
			email: data.email,
			passwordHash: data.passwordHash ?? null,
			createdAt: new Date(),
			lastLogin: null,
		}
		mockDatabase.users.set(user.id, user)
		return user
	}),

	update: vi.fn(
		async (id: string, data: Partial<NewUser>): Promise<User | null> => {
			const user = mockDatabase.users.get(id)
			if (!user) return null
			const updated = { ...user, ...data }
			mockDatabase.users.set(id, updated)
			return updated
		},
	),

	delete: vi.fn(async (id: string): Promise<boolean> => {
		return mockDatabase.users.delete(id)
	}),

	existsByEmail: vi.fn(async (email: string): Promise<boolean> => {
		for (const user of mockDatabase.users.values()) {
			if (user.email === email) return true
		}
		return false
	}),
}

/**
 * Mock chat repository operations
 */
export const mockChatRepository = {
	findById: vi.fn(async (id: string): Promise<Chat | null> => {
		return mockDatabase.chats.get(id) ?? null
	}),

	findByUserId: vi.fn(async (userId: string): Promise<Chat[]> => {
		const chats: Chat[] = []
		for (const chat of mockDatabase.chats.values()) {
			if (chat.userId === userId) chats.push(chat)
		}
		return chats.sort(
			(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
		)
	}),

	create: vi.fn(async (data: NewChat): Promise<Chat> => {
		const chat: Chat = {
			id: crypto.randomUUID(),
			createdAt: new Date(),
			updatedAt: new Date(),
			title: data.title ?? "New Chat",
			userId: data.userId,
			visibility: data.visibility ?? "private",
			lastContext: data.lastContext ?? null,
		}
		mockDatabase.chats.set(chat.id, chat)
		return chat
	}),

	update: vi.fn(
		async (id: string, data: Partial<NewChat>): Promise<Chat | null> => {
			const chat = mockDatabase.chats.get(id)
			if (!chat) return null
			const updated = { ...chat, ...data, updatedAt: new Date() }
			mockDatabase.chats.set(id, updated)
			return updated
		},
	),

	delete: vi.fn(async (id: string): Promise<boolean> => {
		// Cascade delete messages
		for (const [messageId, message] of mockDatabase.messages.entries()) {
			if (message.chatId === id) {
				mockDatabase.messages.delete(messageId)
			}
		}
		return mockDatabase.chats.delete(id)
	}),

	deleteAllForUser: vi.fn(async (userId: string): Promise<number> => {
		let count = 0
		for (const [chatId, chat] of mockDatabase.chats.entries()) {
			if (chat.userId === userId) {
				mockDatabase.chats.delete(chatId)
				count++
			}
		}
		return count
	}),
}

/**
 * Mock message repository operations
 */
export const mockMessageRepository = {
	findById: vi.fn(async (id: string): Promise<Message | null> => {
		return mockDatabase.messages.get(id) ?? null
	}),

	findByChatId: vi.fn(async (chatId: string): Promise<Message[]> => {
		const messages: Message[] = []
		for (const message of mockDatabase.messages.values()) {
			if (message.chatId === chatId) messages.push(message)
		}
		return messages.sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
		)
	}),

	create: vi.fn(async (data: NewMessage): Promise<Message> => {
		const message: Message = {
			id: crypto.randomUUID(),
			chatId: data.chatId,
			role: data.role,
			parts: data.parts,
			attachments: data.attachments ?? [],
			createdAt: new Date(),
		}
		mockDatabase.messages.set(message.id, message)
		return message
	}),

	createMany: vi.fn(async (messages: NewMessage[]): Promise<Message[]> => {
		return Promise.all(
			messages.map((data) => mockMessageRepository.create(data)),
		)
	}),

	delete: vi.fn(async (id: string): Promise<boolean> => {
		return mockDatabase.messages.delete(id)
	}),

	deleteAfterTimestamp: vi.fn(
		async (chatId: string, timestamp: Date): Promise<number> => {
			let count = 0
			for (const [
				messageId,
				message,
			] of mockDatabase.messages.entries()) {
				if (
					message.chatId === chatId &&
					message.createdAt > timestamp
				) {
					mockDatabase.messages.delete(messageId)
					count++
				}
			}
			return count
		},
	),
}

/**
 * Mock vote repository operations
 */
export const mockVoteRepository = {
	findByIds: vi.fn(
		async (
			chatId: string,
			messageId: string,
			userId: string,
		): Promise<Vote | null> => {
			const key = `${chatId}:${messageId}:${userId}`
			return mockDatabase.votes.get(key) ?? null
		},
	),

	upsert: vi.fn(async (data: NewVote): Promise<Vote> => {
		const key = `${data.chatId}:${data.messageId}:${data.userId}`
		const vote: Vote = {
			chatId: data.chatId,
			messageId: data.messageId,
			userId: data.userId,
			isUpvoted: data.isUpvoted ?? true,
		}
		mockDatabase.votes.set(key, vote)
		return vote
	}),

	deleteByChatId: vi.fn(async (chatId: string): Promise<number> => {
		let count = 0
		for (const [key, vote] of mockDatabase.votes.entries()) {
			if (vote.chatId === chatId) {
				mockDatabase.votes.delete(key)
				count++
			}
		}
		return count
	}),
}

/**
 * Mock artifact repository operations
 */
export const mockArtifactRepository = {
	findById: vi.fn(async (id: string): Promise<Artifact | null> => {
		return mockDatabase.artifacts.get(id) ?? null
	}),

	findByChatId: vi.fn(async (chatId: string): Promise<Artifact[]> => {
		const artifacts: Artifact[] = []
		for (const artifact of mockDatabase.artifacts.values()) {
			if (artifact.chatId === chatId) artifacts.push(artifact)
		}
		return artifacts.sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
		)
	}),

	create: vi.fn(async (data: NewArtifact): Promise<Artifact> => {
		const artifact: Artifact = {
			id: crypto.randomUUID(),
			createdAt: new Date(),
			updatedAt: new Date(),
			chatId: data.chatId,
			kind: data.kind ?? "text",
			title: data.title ?? "Untitled",
			content: data.content ?? "",
			userId: data.userId,
		}
		mockDatabase.artifacts.set(artifact.id, artifact)
		return artifact
	}),

	update: vi.fn(
		async (
			id: string,
			data: Partial<NewArtifact>,
		): Promise<Artifact | null> => {
			const artifact = mockDatabase.artifacts.get(id)
			if (!artifact) return null
			const updated = { ...artifact, ...data }
			mockDatabase.artifacts.set(id, updated)
			return updated
		},
	),

	delete: vi.fn(async (id: string): Promise<boolean> => {
		return mockDatabase.artifacts.delete(id)
	}),
}

// =============================================================================
// Reset Utilities
// =============================================================================

/**
 * Reset all mock database storage
 * Call this in beforeEach or afterEach to ensure test isolation
 */
export function resetMockDatabase(): void {
	mockDatabase.users.clear()
	mockDatabase.chats.clear()
	mockDatabase.messages.clear()
	mockDatabase.votes.clear()
	mockDatabase.artifacts.clear()

	// Reset all mock call counts
	vi.clearAllMocks()
}

/**
 * Seed the mock database with test data
 */
export function seedMockDatabase(data: {
	users?: NewUser[]
	chats?: NewChat[]
	messages?: NewMessage[]
}): void {
	if (data.users) {
		for (const userData of data.users) {
			mockUserRepository.create(userData)
		}
	}
	if (data.chats) {
		for (const chatData of data.chats) {
			mockChatRepository.create(chatData)
		}
	}
	if (data.messages) {
		for (const messageData of data.messages) {
			mockMessageRepository.create(messageData)
		}
	}
}

// =============================================================================
// Mock Module Exports
// =============================================================================

/**
 * Mock the entire lib/db module
 */
export function mockDbModule() {
	return {
		db: createMockDbClient(),
		mockDatabase,
		resetMockDatabase,
		seedMockDatabase,
	}
}
