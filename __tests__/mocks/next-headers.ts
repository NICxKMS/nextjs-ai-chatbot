import { vi } from "vitest"

/** Factory for creating a mock cookies() store with get/set/delete/has. */
export function createMockCookies() {
	const store = new Map<string, { value: string }>()
	return {
		get: vi.fn((name: string) => store.get(name) ?? undefined),
		set: vi.fn((name: string, value: string) => {
			store.set(name, { value })
		}),
		delete: vi.fn((name: string) => {
			store.delete(name)
		}),
		has: vi.fn((name: string) => store.has(name)),
		/** Direct access to the backing store for test assertions. */
		_store: store,
	}
}

/** Factory for creating a mock headers() store with get/set/has. */
export function createMockHeaders() {
	const store = new Map<string, string>()
	return {
		get: vi.fn((name: string) => store.get(name) ?? null),
		set: vi.fn((name: string, value: string) => {
			store.set(name, value)
		}),
		has: vi.fn((name: string) => store.has(name)),
		/** Direct access to the backing store for test assertions. */
		_store: store,
	}
}
