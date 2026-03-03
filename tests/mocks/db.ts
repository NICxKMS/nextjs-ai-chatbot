/**
 * Mock Drizzle client for data access testing.
 * Stub — full implementation deferred until data layer is built (P1).
 */
export function createMockDb() {
	return {
		select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
		insert: () => ({ values: () => Promise.resolve() }),
		update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
		delete: () => ({ where: () => Promise.resolve() }),
	}
}
