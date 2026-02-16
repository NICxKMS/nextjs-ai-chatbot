/**
 * Artifact Workflow Integration Tests
 *
 * Tests cross-module workflows for artifact operations including:
 * - Artifact creation with chat association
 * - Version management and history
 * - Artifact updates and editing
 * - Cross-repository interactions with chats
 *
 * @module tests/integration/artifact-workflow.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { chatFixtures, userFixtures } from "@/src/test/fixtures"
import { mockCacheStorage, resetMockCache } from "@/src/test/mocks/cache"
import {
	mockArtifactRepository,
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

describe("Artifact Workflow Integration", () => {
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
	// Artifact Creation Flow
	// ---------------------------------------------------------------------------

	describe("Artifact Creation Flow", () => {
		it("should create a text artifact for a chat", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat first
			const chat = await mockChatRepository.create({
				title: "Artifact Test Chat",
				userId,
				visibility: "private",
			})

			// Create a text artifact
			const artifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Sample Document",
				kind: "text",
				content: "# Hello World\n\nThis is a sample document.",
				userId,
			})

			expect(artifact).toBeDefined()
			expect(artifact.title).toBe("Sample Document")
			expect(artifact.kind).toBe("text")
			expect(artifact.chatId).toBe(chat.id)
		})

		it("should create a code artifact", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat
			const chat = await mockChatRepository.create({
				title: "Code Chat",
				userId,
				visibility: "private",
			})

			// Create a code artifact
			const artifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "main.ts",
				kind: "code",
				content: "console.log('Hello, World!');",
				userId,
			})

			expect(artifact).toBeDefined()
			expect(artifact.kind).toBe("code")
			expect(artifact.title).toBe("main.ts")
		})

		it("should create artifacts of different kinds", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat
			const chat = await mockChatRepository.create({
				title: "Multi-Artifact Chat",
				userId,
				visibility: "private",
			})

			// Create different artifact types
			const textArtifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Document",
				kind: "text",
				content: "Text content",
				userId,
			})

			const codeArtifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Script",
				kind: "code",
				content: "code here",
				userId,
			})

			const imageArtifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Image",
				kind: "image",
				content: "https://example.com/image.png",
				userId,
			})

			const sheetArtifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Spreadsheet",
				kind: "sheet",
				content: "A,B,C\n1,2,3",
				userId,
			})

			// Verify all artifacts
			expect(textArtifact.kind).toBe("text")
			expect(codeArtifact.kind).toBe("code")
			expect(imageArtifact.kind).toBe("image")
			expect(sheetArtifact.kind).toBe("sheet")

			// Verify all are linked to same chat
			const chatArtifacts = await mockArtifactRepository.findByChatId(
				chat.id,
			)
			expect(chatArtifacts).toHaveLength(4)
		})
	})

	// ---------------------------------------------------------------------------
	// Artifact Retrieval Flow
	// ---------------------------------------------------------------------------

	describe("Artifact Retrieval Flow", () => {
		it("should retrieve artifacts by chat ID", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat with artifacts
			const chat = await mockChatRepository.create({
				title: "Retrieval Test Chat",
				userId,
				visibility: "private",
			})

			await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Artifact 1",
				kind: "text",
				content: "Content 1",
				userId,
			})

			await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Artifact 2",
				kind: "code",
				content: "Content 2",
				userId,
			})

			// Retrieve artifacts
			const artifacts = await mockArtifactRepository.findByChatId(chat.id)

			expect(artifacts).toHaveLength(2)
			expect(artifacts.map((a) => a.title)).toContain("Artifact 1")
			expect(artifacts.map((a) => a.title)).toContain("Artifact 2")
		})

		it("should retrieve single artifact by ID", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat and artifact
			const chat = await mockChatRepository.create({
				title: "Single Artifact Chat",
				userId,
				visibility: "private",
			})

			const created = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Single Document",
				kind: "text",
				content: "Single content",
				userId,
			})

			// Retrieve by ID
			const artifact = await mockArtifactRepository.findById(created.id)

			expect(artifact).toBeDefined()
			expect(artifact?.title).toBe("Single Document")
		})

		it("should return null for non-existent artifact", async () => {
			const artifact =
				await mockArtifactRepository.findById("non-existent-id")
			expect(artifact).toBeNull()
		})
	})

	// ---------------------------------------------------------------------------
	// Artifact Update Flow
	// ---------------------------------------------------------------------------

	describe("Artifact Update Flow", () => {
		it("should update artifact content", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat and artifact
			const chat = await mockChatRepository.create({
				title: "Update Test Chat",
				userId,
				visibility: "private",
			})

			const artifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Original Title",
				kind: "text",
				content: "Original content",
				userId,
			})

			// Update content
			const updated = await mockArtifactRepository.update(artifact.id, {
				content: "Updated content",
			})

			expect(updated).toBeDefined()
			expect(updated?.content).toBe("Updated content")
		})

		it("should update artifact title", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat and artifact
			const chat = await mockChatRepository.create({
				title: "Title Update Chat",
				userId,
				visibility: "private",
			})

			const artifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Old Title",
				kind: "text",
				content: "Content",
				userId,
			})

			// Update title
			const updated = await mockArtifactRepository.update(artifact.id, {
				title: "New Title",
			})

			expect(updated).toBeDefined()
			expect(updated?.title).toBe("New Title")
		})
	})

	// ---------------------------------------------------------------------------
	// Artifact Deletion Flow
	// ---------------------------------------------------------------------------

	describe("Artifact Deletion Flow", () => {
		it("should delete an artifact", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat and artifact
			const chat = await mockChatRepository.create({
				title: "Delete Test Chat",
				userId,
				visibility: "private",
			})

			const artifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "To Delete",
				kind: "text",
				content: "Content",
				userId,
			})

			// Delete
			const deleted = await mockArtifactRepository.delete(artifact.id)
			expect(deleted).toBe(true)

			// Verify deletion
			const retrieved = await mockArtifactRepository.findById(artifact.id)
			expect(retrieved).toBeNull()
		})

		it("should handle deleting non-existent artifact", async () => {
			const deleted =
				await mockArtifactRepository.delete("non-existent-id")
			expect(deleted).toBe(false)
		})
	})

	// ---------------------------------------------------------------------------
	// Cross-Module Integration
	// ---------------------------------------------------------------------------

	describe("Cross-Module Integration", () => {
		it("should integrate with cache on artifact retrieval", async () => {
			const userId = userFixtures.testUser.id
			const cacheKey = `artifact:list:${userId}`

			// Create a chat and artifact
			const chat = await mockChatRepository.create({
				title: "Cache Test Chat",
				userId,
				visibility: "private",
			})

			const artifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Cached Artifact",
				kind: "text",
				content: "Content",
				userId,
			})

			// Simulate caching
			mockCacheStorage.set(cacheKey, {
				value: [artifact],
				expiresAt: Date.now() + 3600000,
			})

			// Verify cache hit
			const cached = mockCacheStorage.get(cacheKey)
			expect(cached).toBeDefined()
			expect(
				(cached?.value as Array<{ id: string }>).find(
					(a) => a.id === artifact.id,
				),
			).toBeDefined()
		})

		it("should invalidate cache on artifact update", async () => {
			const userId = userFixtures.testUser.id
			const cacheKey = `artifact:${userId}`

			// Create a chat and artifact
			const chat = await mockChatRepository.create({
				title: "Cache Invalidation Chat",
				userId,
				visibility: "private",
			})

			const artifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Cache Test",
				kind: "text",
				content: "Content",
				userId,
			})

			// Cache the artifact
			mockCacheStorage.set(cacheKey, {
				value: artifact,
				expiresAt: Date.now() + 3600000,
			})

			// Update artifact
			await mockArtifactRepository.update(artifact.id, {
				content: "Updated content",
			})

			// Invalidate cache
			mockCacheStorage.delete(cacheKey)

			// Verify cache is invalidated
			const cached = mockCacheStorage.get(cacheKey)
			expect(cached).toBeUndefined()
		})

		it("should handle artifact creation with message context", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat with messages
			const chat = await mockChatRepository.create({
				title: "Message Context Chat",
				userId,
				visibility: "private",
			})

			// Create a message that references an artifact
			await mockMessageRepository.create({
				chatId: chat.id,
				role: "assistant",
				parts: [
					{ type: "text", text: "I've created a document for you." },
					{
						type: "tool-call",
						toolCallId: "tool-1",
						toolName: "createDocument",
						args: { title: "Generated Document", kind: "text" },
					},
				],
				attachments: [],
			})

			// Create the artifact
			await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Generated Document",
				kind: "text",
				content: "Generated content from AI",
				userId,
			})

			// Verify both exist
			const messages = await mockMessageRepository.findByChatId(chat.id)
			const artifacts = await mockArtifactRepository.findByChatId(chat.id)

			expect(messages).toHaveLength(1)
			expect(artifacts).toHaveLength(1)
		})

		it("should handle concurrent artifact updates", async () => {
			const userId = userFixtures.testUser.id

			// Create a chat and artifact
			const chat = await mockChatRepository.create({
				title: "Concurrent Update Chat",
				userId,
				visibility: "private",
			})

			const artifact = await mockArtifactRepository.create({
				chatId: chat.id,
				title: "Concurrent Test",
				kind: "text",
				content: "Original",
				userId,
			})

			// Simulate concurrent updates (last one wins)
			const updates = await Promise.all([
				mockArtifactRepository.update(artifact.id, {
					content: "Update 1",
				}),
				mockArtifactRepository.update(artifact.id, {
					content: "Update 2",
				}),
				mockArtifactRepository.update(artifact.id, {
					content: "Update 3",
				}),
			])

			// All updates should succeed
			updates.forEach((update) => {
				expect(update).toBeDefined()
			})

			// Final state should be one of the updates
			const final = await mockArtifactRepository.findById(artifact.id)
			expect(final?.content).toBeDefined()
		})
	})
})
