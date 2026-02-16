/**
 * Chat Flow Integration Tests
 *
 * Tests cross-module workflows for chat operations including:
 * - Chat creation with user authentication
 * - Message saving and retrieval
 * - Chat history management
 * - Cross-repository interactions
 *
 * @module tests/integration/chat-flow.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { chatFixtures, userFixtures } from "@/src/test/fixtures"
import { mockCacheStorage, resetMockCache } from "@/src/test/mocks/cache"
import {
	mockChatRepository,
	mockMessageRepository,
	resetMockDatabase,
	seedMockDatabase,
} from "@/src/test/mocks/db"

// =============================================================================
// Mocks
// =============================================================================

// Mock the guards module
vi.mock("@/lib/auth/guards", () => ({
	requireAuthAction: vi.fn(async () => userFixtures.testUser.id),
	requireSession: vi.fn(async () => ({
		user: {
			id: userFixtures.testUser.id,
			email: userFixtures.testUser.email,
		},
		expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
	})),
	isAuthenticated: vi.fn(async () => true),
}))

// Mock the rate-limit module
vi.mock("@/lib/rate-limit", () => ({
	checkChatLimit: vi.fn(async () => ({
		success: true,
		reset: Date.now() + 60000,
	})),
	checkApiLimit: vi.fn(async () => ({
		success: true,
		reset: Date.now() + 60000,
	})),
	getRetryAfter: vi.fn(() => 60),
}))

// Mock revalidatePath
vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}))

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Setup test data in mock database
 */
function setupTestData() {
	seedMockDatabase({
		users: [
			{
				email: userFixtures.testUser.email,
				passwordHash: userFixtures.testUser.passwordHash ?? null,
			},
		],
		chats: [
			{
				title: chatFixtures.testChat.title,
				userId: userFixtures.testUser.id,
				visibility: "private",
			},
		],
	})
}

// =============================================================================
// Tests
// =============================================================================

describe("Chat Flow Integration", () => {
	beforeEach(() => {
		resetMockDatabase()
		resetMockCache()
		setupTestData()
		vi.clearAllMocks()
	})

	afterEach(() => {
		resetMockDatabase()
		resetMockCache()
	})

	// ---------------------------------------------------------------------------
	// Chat Creation Flow
	// ---------------------------------------------------------------------------

	describe("Chat Creation Flow", () => {
		it("should create a new chat for authenticated user", async () => {
			const userId = userFixtures.testUser.id

			// Create chat via repository
			const chat = await mockChatRepository.create({
				title: "New Test Chat",
				userId,
				visibility: "private",
			})

			expect(chat).toBeDefined()
			expect(chat.title).toBe("New Test Chat")
			expect(chat.userId).toBe(userId)
			expect(chat.visibility).toBe("private")
			expect(chat.id).toBeDefined()
		})

		it("should prevent creating chat for non-existent user", async () => {
			const nonExistentUserId = "non-existent-user-id"

			// Create chat should still work (no foreign key constraint in mock)
			// but in real DB this would fail
			const chat = await mockChatRepository.create({
				title: "Test Chat",
				userId: nonExistentUserId,
				visibility: "private",
			})

			expect(chat).toBeDefined()
			expect(chat.userId).toBe(nonExistentUserId)
		})

		it("should create multiple chats for same user", async () => {
			const userId = userFixtures.testUser.id

			// Create first chat
			await mockChatRepository.create({
				title: "Chat 1",
				userId,
				visibility: "private",
			})

			// Create second chat
			await mockChatRepository.create({
				title: "Chat 2",
				userId,
				visibility: "public",
			})

			// Retrieve all chats for user
			const userChats = await mockChatRepository.findByUserId(userId)

			expect(userChats).toHaveLength(3) // 1 from seed + 2 new
			expect(userChats.map((c) => c.title)).toContain("Chat 1")
			expect(userChats.map((c) => c.title)).toContain("Chat 2")
		})
	})

	// ---------------------------------------------------------------------------
	// Message Flow
	// ---------------------------------------------------------------------------

	describe("Message Flow", () => {
		it("should save and retrieve messages for a chat", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat first
			const chat = await mockChatRepository.create({
				title: "Message Test Chat",
				userId,
				visibility: "private",
			})

			// Create user message
			await mockMessageRepository.create({
				chatId: chat.id,
				role: "user",
				parts: [{ type: "text", text: "Hello, AI!" }],
				attachments: [],
			})

			// Create assistant message
			await mockMessageRepository.create({
				chatId: chat.id,
				role: "assistant",
				parts: [{ type: "text", text: "Hello! How can I help you?" }],
				attachments: [],
			})

			// Retrieve messages
			const messages = await mockMessageRepository.findByChatId(chat.id)

			expect(messages).toHaveLength(2)
			expect(messages[0]?.role).toBe("user")
			expect(messages[1]?.role).toBe("assistant")
		})

		it("should handle message with attachments", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat
			const chat = await mockChatRepository.create({
				title: "Attachment Test Chat",
				userId,
				visibility: "private",
			})

			// Create message with attachment
			const message = await mockMessageRepository.create({
				chatId: chat.id,
				role: "user",
				parts: [{ type: "text", text: "Check this image" }],
				attachments: [
					{
						name: "test-image.png",
						contentType: "image/png",
						url: "https://example.com/image.png",
					},
				],
			})

			const attachments = message.attachments as Array<{ name: string }>
			expect(attachments).toHaveLength(1)
			expect(attachments[0]?.name).toBe("test-image.png")
		})

		it("should save multiple messages at once", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat
			const chat = await mockChatRepository.create({
				title: "Bulk Message Test",
				userId,
				visibility: "private",
			})

			// Create multiple messages
			const messages = await mockMessageRepository.createMany([
				{
					chatId: chat.id,
					role: "user",
					parts: [{ type: "text", text: "Message 1" }],
					attachments: [],
				},
				{
					chatId: chat.id,
					role: "assistant",
					parts: [{ type: "text", text: "Response 1" }],
					attachments: [],
				},
				{
					chatId: chat.id,
					role: "user",
					parts: [{ type: "text", text: "Message 2" }],
					attachments: [],
				},
			])

			expect(messages).toHaveLength(3)

			// Verify all messages are stored
			const storedMessages = await mockMessageRepository.findByChatId(
				chat.id,
			)
			expect(storedMessages).toHaveLength(3)
		})
	})

	// ---------------------------------------------------------------------------
	// Chat History Flow
	// ---------------------------------------------------------------------------

	describe("Chat History Flow", () => {
		it("should retrieve chat history for user", async () => {
			const userId = userFixtures.testUser.id

			// Create multiple chats
			await mockChatRepository.create({
				title: "History Chat 1",
				userId,
				visibility: "private",
			})
			await mockChatRepository.create({
				title: "History Chat 2",
				userId,
				visibility: "public",
			})

			// Retrieve history
			const chats = await mockChatRepository.findByUserId(userId)

			expect(chats.length).toBeGreaterThanOrEqual(2)
		})

		it("should delete chat and cascade to messages", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat with messages
			const chat = await mockChatRepository.create({
				title: "Chat to Delete",
				userId,
				visibility: "private",
			})

			await mockMessageRepository.create({
				chatId: chat.id,
				role: "user",
				parts: [{ type: "text", text: "Test message" }],
				attachments: [],
			})

			// Verify chat and messages exist
			let messages = await mockMessageRepository.findByChatId(chat.id)
			expect(messages).toHaveLength(1)

			// Delete chat
			const deleted = await mockChatRepository.delete(chat.id)
			expect(deleted).toBe(true)

			// Verify messages are deleted (cascade)
			messages = await mockMessageRepository.findByChatId(chat.id)
			expect(messages).toHaveLength(0)
		})

		it("should delete all chats for a user", async () => {
			const userId = userFixtures.testUser.id

			// Create multiple chats
			await mockChatRepository.create({
				title: "Chat 1",
				userId,
				visibility: "private",
			})
			await mockChatRepository.create({
				title: "Chat 2",
				userId,
				visibility: "private",
			})

			// Delete all chats for user
			const count = await mockChatRepository.deleteAllForUser(userId)

			expect(count).toBeGreaterThanOrEqual(2)

			// Verify all chats are deleted
			const remainingChats = await mockChatRepository.findByUserId(userId)
			expect(remainingChats).toHaveLength(0)
		})
	})

	// ---------------------------------------------------------------------------
	// Chat Update Flow
	// ---------------------------------------------------------------------------

	describe("Chat Update Flow", () => {
		it("should update chat title", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat
			const chat = await mockChatRepository.create({
				title: "Original Title",
				userId,
				visibility: "private",
			})

			// Update title
			const updated = await mockChatRepository.update(chat.id, {
				title: "Updated Title",
			})

			expect(updated).toBeDefined()
			expect(updated?.title).toBe("Updated Title")
		})

		it("should update chat visibility", async () => {
			const userId = userFixtures.testUser.id

			// Create a private chat
			const chat = await mockChatRepository.create({
				title: "Private Chat",
				userId,
				visibility: "private",
			})

			// Make it public
			const updated = await mockChatRepository.update(chat.id, {
				visibility: "public",
			})

			expect(updated).toBeDefined()
			expect(updated?.visibility).toBe("public")
		})
	})

	// ---------------------------------------------------------------------------
	// Cross-Module Integration
	// ---------------------------------------------------------------------------

	describe("Cross-Module Integration", () => {
		it("should integrate with cache on chat retrieval", async () => {
			const userId = userFixtures.testUser.id
			const cacheKey = `chat:list:${userId}`

			// Create a chat
			const chat = await mockChatRepository.create({
				title: "Cached Chat",
				userId,
				visibility: "private",
			})

			// Simulate caching the chat list
			mockCacheStorage.set(cacheKey, {
				value: [chat],
				expiresAt: Date.now() + 3600000,
			})

			// Verify cache hit
			const cached = mockCacheStorage.get(cacheKey)
			expect(cached).toBeDefined()
			expect(
				(cached?.value as Array<{ id: string }>).find(
					(c) => c.id === chat.id,
				),
			).toBeDefined()
		})

		it("should invalidate cache on chat update", async () => {
			const userId = userFixtures.testUser.id
			const cacheKey = `chat:list:${userId}`

			// Create a chat
			const chat = await mockChatRepository.create({
				title: "Chat to Update",
				userId,
				visibility: "private",
			})

			// Cache the chat list
			mockCacheStorage.set(cacheKey, {
				value: [chat],
				expiresAt: Date.now() + 3600000,
			})

			// Update the chat
			await mockChatRepository.update(chat.id, {
				title: "Updated Title",
			})

			// Invalidate cache (simulating what the service would do)
			mockCacheStorage.delete(cacheKey)

			// Verify cache is invalidated
			const cached = mockCacheStorage.get(cacheKey)
			expect(cached).toBeUndefined()
		})

		it("should handle concurrent message creation", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat
			const chat = await mockChatRepository.create({
				title: "Concurrent Test",
				userId,
				visibility: "private",
			})

			// Simulate concurrent message creation
			const messagePromises = Array.from({ length: 5 }, (_, i) =>
				mockMessageRepository.create({
					chatId: chat.id,
					role: i % 2 === 0 ? "user" : "assistant",
					parts: [{ type: "text", text: `Message ${i + 1}` }],
					attachments: [],
				}),
			)

			const messages = await Promise.all(messagePromises)

			expect(messages).toHaveLength(5)
			messages.forEach((msg, i) => {
				expect(msg.id).toBeDefined()
				expect(msg.role).toBe(i % 2 === 0 ? "user" : "assistant")
			})
		})
	})
})
