import { vi } from "vitest"

/** Factory for creating mock db instances with chainable query builder. */
export function createMockDb() {
	const chain = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		onConflictDoUpdate: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
		execute: vi.fn().mockResolvedValue([]),
	}
	return chain
}
