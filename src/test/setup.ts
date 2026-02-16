/**
 * Vitest Global Setup
 *
 * Global test configuration for unit and integration tests.
 * Sets up mocks, environment variables, and test utilities.
 *
 * @module src/test/setup
 */

import { afterAll, afterEach, beforeAll, vi } from "vitest"

// =============================================================================
// Environment Variable Mocks
// =============================================================================

/**
 * Set up test environment variables
 * These are used when actual environment variables are not available
 */
beforeAll(() => {
	// Set test environment variables if not already set
	// Note: NODE_ENV is read-only, so we don't try to set it

	// Database - use test database or mock
	process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test_db"

	// Redis/Cache - disable for unit tests by default
	process.env.CACHE_KV_REST_API_URL ??= ""
	process.env.CACHE_KV_REST_API_TOKEN ??= ""

	// Auth
	process.env.AUTH_SECRET ??= "test-auth-secret-key-for-testing-only"
	process.env.NEXTAUTH_SECRET ??= "test-nextauth-secret-key-for-testing-only"

	// AI Provider API Keys - mock by default
	process.env.OPENAI_API_KEY ??= "test-openai-key"
	process.env.GOOGLE_GENERATIVE_AI_API_KEY ??= "test-google-key"
	process.env.XAI_API_KEY ??= "test-xai-key"

	// Next.js
	process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000"
})

// =============================================================================
// Global Mocks
// =============================================================================

// Mock server-only module for tests
vi.mock("server-only", () => ({
	default: {},
}))

// Mock Next.js server actions
vi.mock("next/server", () => ({
	default: vi.fn(),
}))

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Reset all mocks after each test
 */
afterEach(() => {
	vi.clearAllMocks()
})

/**
 * Global teardown
 */
afterAll(() => {
	vi.restoreAllMocks()
})

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Helper to create a mock request with headers
 */
export function createMockRequest(
	options: {
		method?: string
		url?: string
		headers?: Record<string, string>
		body?: unknown
	} = {},
): Request {
	const {
		method = "GET",
		url = "http://localhost:3000",
		headers = {},
		body,
	} = options

	return new Request(url, {
		method,
		headers: new Headers(headers),
		body: body ? JSON.stringify(body) : null,
	})
}

/**
 * Helper to create mock session data
 */
export function createMockSession(
	options: { userId?: string; email?: string; isGuest?: boolean } = {},
) {
	return {
		user: {
			id: options.userId ?? "test-user-id",
			email: options.email ?? "test@example.com",
			isGuest: options.isGuest ?? false,
		},
		expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
	}
}

/**
 * Helper to wait for async operations in tests
 */
export function waitFor(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Helper to create mock Date for deterministic testing
 */
export function mockDate(date: Date): void {
	vi.setSystemTime(date)
}

/**
 * Helper to restore real Date
 */
export function restoreDate(): void {
	vi.useRealTimers()
}
