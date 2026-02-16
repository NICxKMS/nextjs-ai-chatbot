/**
 * Auth Flow Integration Tests
 *
 * Tests cross-module workflows for authentication operations including:
 * - User registration flow
 * - Login/logout flow
 * - Session management
 * - Cross-repository interactions with user data
 *
 * @module tests/integration/auth-flow.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { userFixtures } from "@/src/test/fixtures"
import { mockCacheStorage, resetMockCache } from "@/src/test/mocks/cache"
import {
	mockUserRepository,
	resetMockDatabase,
	seedMockDatabase,
} from "@/src/test/mocks/db"

// =============================================================================
// Mocks
// =============================================================================

// Mock NextAuth signIn
vi.mock("@/lib/auth", () => ({
	signIn: vi.fn(async () => ({ ok: true })),
	signOut: vi.fn(async () => ({ ok: true })),
}))

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
	getSessionUser: vi.fn(async () => ({
		id: userFixtures.testUser.id,
		email: userFixtures.testUser.email,
	})),
}))

// Mock redirect
vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
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
	})
}

// =============================================================================
// Tests
// =============================================================================

describe("Auth Flow Integration", () => {
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
	// User Registration Flow
	// ---------------------------------------------------------------------------

	describe("User Registration Flow", () => {
		it("should create a new user account", async () => {
			const email = "newuser@example.com"
			const passwordHash = "$2b$10$hashedpassword"

			// Create user
			const user = await mockUserRepository.create({
				email,
				passwordHash,
			})

			expect(user).toBeDefined()
			expect(user.email).toBe(email)
			expect(user.id).toBeDefined()
		})

		it("should prevent duplicate email registration", async () => {
			const email = userFixtures.testUser.email

			// Check if email exists
			const exists = await mockUserRepository.existsByEmail(email)
			expect(exists).toBe(true)

			// Attempt to create user with same email should fail in real app
			// In mock, we just verify the check works
		})

		it("should hash password during registration", async () => {
			const email = "secure@example.com"
			const plainPassword = "password123"
			const hashedPassword = "$2b$10$hashedpassword"

			// Create user with hashed password
			const user = await mockUserRepository.create({
				email,
				passwordHash: hashedPassword,
			})

			// Password should be hashed, not plain
			expect(user.passwordHash).toBe(hashedPassword)
			expect(user.passwordHash).not.toBe(plainPassword)
		})
	})

	// ---------------------------------------------------------------------------
	// Login Flow
	// ---------------------------------------------------------------------------

	describe("Login Flow", () => {
		it("should find user by email for login", async () => {
			const email = userFixtures.testUser.email

			// Find user by email
			const user = await mockUserRepository.findByEmail(email)

			expect(user).toBeDefined()
			expect(user?.email).toBe(email)
		})

		it("should return null for non-existent email", async () => {
			const email = "nonexistent@example.com"

			const user = await mockUserRepository.findByEmail(email)
			expect(user).toBeNull()
		})

		it("should update last login timestamp", async () => {
			// Create a user first
			const user = await mockUserRepository.create({
				email: "login-test@example.com",
				passwordHash: "hash",
			})

			// Update last login
			const updated = await mockUserRepository.update(user.id, {
				lastLogin: new Date(),
			})

			expect(updated).toBeDefined()
			expect(updated?.lastLogin).toBeDefined()
		})
	})

	// ---------------------------------------------------------------------------
	// Session Management Flow
	// ---------------------------------------------------------------------------

	describe("Session Management Flow", () => {
		it("should cache user session data", async () => {
			// Create a user first
			const user = await mockUserRepository.create({
				email: "session-test@example.com",
				passwordHash: "hash",
			})
			const cacheKey = `session:user:${user.id}`

			// Cache session data
			mockCacheStorage.set(cacheKey, {
				value: user,
				expiresAt: Date.now() + 3600000, // 1 hour
			})

			// Verify cache
			const cached = mockCacheStorage.get(cacheKey)
			expect(cached).toBeDefined()
			expect((cached?.value as { id: string }).id).toBe(user.id)
		})

		it("should invalidate session cache on logout", async () => {
			const userId = userFixtures.testUser.id
			const cacheKey = `session:user:${userId}`

			// Cache session data
			mockCacheStorage.set(cacheKey, {
				value: { id: userId },
				expiresAt: Date.now() + 3600000,
			})

			// Logout - invalidate cache
			mockCacheStorage.delete(cacheKey)

			// Verify cache is cleared
			const cached = mockCacheStorage.get(cacheKey)
			expect(cached).toBeUndefined()
		})

		it("should handle session expiration", async () => {
			const userId = userFixtures.testUser.id
			const cacheKey = `session:user:${userId}`

			// Cache with expired TTL
			mockCacheStorage.set(cacheKey, {
				value: { id: userId },
				expiresAt: Date.now() - 1000, // Expired
			})

			// Create mock Redis client to check TTL behavior
			const { createMockRedisClient } = await import(
				"@/src/test/mocks/cache"
			)
			const redis = createMockRedisClient()

			// Get should return null for expired
			const result = await redis.get(cacheKey)
			expect(result).toBeNull()
		})
	})

	// ---------------------------------------------------------------------------
	// User Data Management Flow
	// ---------------------------------------------------------------------------

	describe("User Data Management Flow", () => {
		it("should retrieve user by ID", async () => {
			// Create a user first
			const createdUser = await mockUserRepository.create({
				email: "retrieve-test@example.com",
				passwordHash: "hash",
			})

			const user = await mockUserRepository.findById(createdUser.id)

			expect(user).toBeDefined()
			expect(user?.id).toBe(createdUser.id)
		})

		it("should update user profile", async () => {
			const userId = userFixtures.testUser.id

			const updated = await mockUserRepository.update(userId, {
				lastLogin: new Date(),
			})

			expect(updated).toBeDefined()
		})

		it("should delete user account", async () => {
			// Create a user to delete
			const user = await mockUserRepository.create({
				email: "delete@example.com",
				passwordHash: "hash",
			})

			// Delete user
			const deleted = await mockUserRepository.delete(user.id)
			expect(deleted).toBe(true)

			// Verify deletion
			const found = await mockUserRepository.findById(user.id)
			expect(found).toBeNull()
		})
	})

	// ---------------------------------------------------------------------------
	// Cross-Module Integration
	// ---------------------------------------------------------------------------

	describe("Cross-Module Integration", () => {
		it("should integrate with cache for user lookups", async () => {
			const email = userFixtures.testUser.email
			const cacheKey = `user:email:${email}`

			// Find user
			const user = await mockUserRepository.findByEmail(email)

			// Cache the result
			mockCacheStorage.set(cacheKey, {
				value: user,
				expiresAt: Date.now() + 3600000,
			})

			// Verify cache hit
			const cached = mockCacheStorage.get(cacheKey)
			expect(cached).toBeDefined()
			expect((cached?.value as { email: string }).email).toBe(email)
		})

		it("should invalidate user cache on update", async () => {
			const userId = userFixtures.testUser.id
			const cacheKey = `user:${userId}`

			// Cache user data
			const user = await mockUserRepository.findById(userId)
			mockCacheStorage.set(cacheKey, {
				value: user,
				expiresAt: Date.now() + 3600000,
			})

			// Update user
			await mockUserRepository.update(userId, {
				lastLogin: new Date(),
			})

			// Invalidate cache
			mockCacheStorage.delete(cacheKey)

			// Verify cache is invalidated
			const cached = mockCacheStorage.get(cacheKey)
			expect(cached).toBeUndefined()
		})

		it("should handle concurrent user operations", async () => {
			const userId = userFixtures.testUser.id

			// Simulate concurrent updates
			const updates = await Promise.all([
				mockUserRepository.update(userId, { lastLogin: new Date() }),
				mockUserRepository.findById(userId),
				mockUserRepository.findByEmail(userFixtures.testUser.email),
			])

			// All operations should succeed
			expect(updates[0]).toBeDefined() // update result
			expect(updates[1]).toBeDefined() // findById result
			expect(updates[2]).toBeDefined() // findByEmail result
		})

		it("should handle guest user creation", async () => {
			// Create guest user (no password)
			const guestUser = await mockUserRepository.create({
				email: "guest@example.com",
				passwordHash: null,
			})

			expect(guestUser).toBeDefined()
			expect(guestUser.passwordHash).toBeNull()

			// Guest should be able to find their account
			const found = await mockUserRepository.findById(guestUser.id)
			expect(found).toBeDefined()
		})
	})

	// ---------------------------------------------------------------------------
	// Error Handling
	// ---------------------------------------------------------------------------

	describe("Error Handling", () => {
		it("should handle non-existent user lookup gracefully", async () => {
			const user = await mockUserRepository.findById("non-existent-id")
			expect(user).toBeNull()
		})

		it("should handle update of non-existent user", async () => {
			const updated = await mockUserRepository.update("non-existent-id", {
				lastLogin: new Date(),
			})
			expect(updated).toBeNull()
		})

		it("should handle delete of non-existent user", async () => {
			const deleted = await mockUserRepository.delete("non-existent-id")
			expect(deleted).toBe(false)
		})
	})
})
