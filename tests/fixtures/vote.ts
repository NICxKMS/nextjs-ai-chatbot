import type { Vote } from "@/lib/types/models.types"

import { TEST_USER_ID } from "./user"

/**
 * Create a typed mock Vote entity with sensible defaults.
 * Supports override pattern: `createMockVote({ isUpvoted: false })`
 */
export function createMockVote(overrides?: Partial<Vote>): Vote {
	return {
		chatId: overrides?.chatId ?? crypto.randomUUID(),
		messageId: overrides?.messageId ?? crypto.randomUUID(),
		userId: TEST_USER_ID,
		isUpvoted: true,
		...overrides,
	}
}
