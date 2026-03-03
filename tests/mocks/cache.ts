/**
 * Mock cache client for cache layer testing.
 * Stub — full implementation deferred until cache layer is built (P1).
 */
export function createMockCache() {
	return {
		get: (_key: string) => Promise.resolve(null),
		set: (_key: string, _value: unknown, _ttl?: number) => Promise.resolve(),
		delete: (_key: string) => Promise.resolve(),
		has: (_key: string) => Promise.resolve(false),
	}
}
