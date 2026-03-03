import type { AppSession } from "@/features/auth/types/auth.types"
import type { User } from "@/lib/types/models.types"

// ── Default IDs for multi-user scenarios ─────────────────────
export const TEST_USER_ID = "00000000-0000-4000-8000-000000000001"
export const TEST_OTHER_USER_ID = "00000000-0000-4000-8000-000000000002"
export const TEST_GUEST_ID = "guest:00000000-0000-4000-8000-000000000099"

/**
 * Create a typed mock User entity with sensible defaults.
 * Supports override pattern: `createMockUser({ email: "other@test.com" })`
 */
export function createMockUser(overrides?: Partial<User>): User {
	return {
		id: crypto.randomUUID(),
		email: "test@example.com",
		passwordHash: "hashed-password",
		createdAt: new Date("2026-01-01T00:00:00Z"),
		lastLogin: null,
		...overrides,
	}
}

/**
 * Create a mock AppSession suitable for auth testing.
 * Supports multi-user scenarios via overrides:
 *   - `createMockSession()` → default owner session
 *   - `createMockSession({ user: { id: TEST_OTHER_USER_ID, type: "authenticated" } })` → non-owner
 *   - `createMockSession({ user: { id: TEST_GUEST_ID, type: "guest" } })` → guest session
 */
export function createMockSession(overrides?: Partial<AppSession>): AppSession {
	return {
		user: {
			id: TEST_USER_ID,
			type: "authenticated",
			email: "test@example.com",
			...overrides?.user,
		},
	}
}

/**
 * Convenience: create an owner + non-owner pair for authorization tests.
 */
export function createMockUserPair() {
	const owner = createMockUser({ id: TEST_USER_ID })
	const other = createMockUser({
		id: TEST_OTHER_USER_ID,
		email: "other@example.com",
	})
	const ownerSession = createMockSession()
	const otherSession = createMockSession({
		user: { id: TEST_OTHER_USER_ID, type: "authenticated", email: "other@example.com" },
	})

	return { owner, other, ownerSession, otherSession }
}
