/**
 * Mock session resolution for auth testing.
 * Stub — full implementation deferred until auth system is built (P2).
 */
export function mockResolveSession() {
	return {
		user: {
			id: "test-user-id",
			email: "test@example.com",
		},
	}
}

/**
 * Returns null to simulate an unauthenticated session.
 */
export function mockResolveSessionNull() {
	return null
}
