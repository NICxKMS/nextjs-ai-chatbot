import type { Artifact } from "@/lib/types/models.types"

import { TEST_USER_ID } from "./user"

/**
 * Create a typed mock Artifact entity with sensible defaults.
 * Returns Artifact (NOT Document) per naming conventions.
 * Supports override pattern: `createMockArtifact({ kind: "code" })`
 */
export function createMockArtifact(overrides?: Partial<Artifact>): Artifact {
	return {
		id: crypto.randomUUID(),
		createdAt: new Date("2026-01-01T00:00:00Z"),
		updatedAt: new Date("2026-01-01T00:00:00Z"),
		title: "Test Artifact",
		content: "Test artifact content",
		kind: "text",
		userId: TEST_USER_ID,
		chatId: overrides?.chatId ?? crypto.randomUUID(),
		...overrides,
	}
}
