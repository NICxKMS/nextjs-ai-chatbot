import { inArray } from "drizzle-orm"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { artifacts, chats, users } from "@/lib/db/schema"
import { createMockSession } from "@/tests/fixtures/user"
import {
	closeRealDbHarness,
	getRealDbHarness,
	getRealDbSkipReason,
	hasRealDbTestConfig,
} from "@/tests/utils/real-db"

const mockGetAppSession = vi.fn()

vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

type SuggestionsRouteGet = typeof import("@/app/api/suggestions/route").GET
type SuggestionDataModule = typeof import("@/lib/data/suggestion")

let GET: SuggestionsRouteGet
let deleteSuggestionsByArtifactVersion: SuggestionDataModule["deleteSuggestionsByArtifactVersion"]
let getSuggestionsByArtifactVersion: SuggestionDataModule["getSuggestionsByArtifactVersion"]
let saveSuggestions: SuggestionDataModule["saveSuggestions"]

const seededUserIds = new Set<string>()
const describeRealDb = hasRealDbTestConfig ? describe : describe.skip

async function seedVersionedSuggestions() {
	const { db } = await getRealDbHarness()
	const userId = crypto.randomUUID()
	const chatId = crypto.randomUUID()
	const artifactId = crypto.randomUUID()
	const olderCreatedAt = new Date("2026-01-01T00:00:00.000Z")
	const newerCreatedAt = new Date("2026-01-02T00:00:00.000Z")

	seededUserIds.add(userId)

	await db.insert(users).values({
		id: userId,
		email: `db-${userId}@example.com`,
	})

	await db.insert(chats).values({
		id: chatId,
		userId,
		title: "Suggestion DB integration chat",
		visibility: "private",
		createdAt: olderCreatedAt,
		updatedAt: newerCreatedAt,
	})

	await db.insert(artifacts).values([
		{
			id: artifactId,
			createdAt: olderCreatedAt,
			updatedAt: olderCreatedAt,
			title: "Versioned artifact",
			content: "First version",
			kind: "text",
			userId,
			chatId,
		},
		{
			id: artifactId,
			createdAt: newerCreatedAt,
			updatedAt: newerCreatedAt,
			title: "Versioned artifact",
			content: "Second version",
			kind: "text",
			userId,
			chatId,
		},
	])

	await saveSuggestions([
		{
			artifactId,
			artifactCreatedAt: olderCreatedAt,
			originalText: "first draft",
			suggestedText: "first version suggestion",
			description: "Older version only",
			userId,
		},
		{
			artifactId,
			artifactCreatedAt: newerCreatedAt,
			originalText: "second draft",
			suggestedText: "latest version suggestion",
			description: "Newest version only",
			userId,
		},
	])

	return { artifactId, newerCreatedAt, olderCreatedAt, userId }
}

describeRealDb(
	`Suggestion version integration (real DB${getRealDbSkipReason() ? `: ${getRealDbSkipReason()}` : ""})`,
	() => {
		beforeAll(async () => {
			await getRealDbHarness()
			;({ GET } = await import("@/app/api/suggestions/route"))
			;({
				deleteSuggestionsByArtifactVersion,
				getSuggestionsByArtifactVersion,
				saveSuggestions,
			} = await import("@/lib/data/suggestion"))
		})

		beforeEach(() => {
			mockGetAppSession.mockReset()
		})

		afterEach(async () => {
			if (seededUserIds.size === 0) {
				return
			}

			const { db } = await getRealDbHarness()
			await db.delete(users).where(inArray(users.id, [...seededUserIds]))
			seededUserIds.clear()
		})

		afterAll(async () => {
			await closeRealDbHarness()
		})

		it("returns only the latest version suggestions when artifactCreatedAt is omitted", async () => {
			const seeded = await seedVersionedSuggestions()
			mockGetAppSession.mockResolvedValue(
				createMockSession({
					user: {
						id: seeded.userId,
						type: "authenticated",
						email: `db-${seeded.userId}@example.com`,
					},
				}),
			)

			const response = await GET(
				new Request(`http://localhost/api/suggestions?artifactId=${seeded.artifactId}`),
			)

			expect(response.status).toBe(200)
			const body = (await response.json()) as {
				suggestions: Array<{ artifactCreatedAt: string; suggestedText: string }>
			}

			expect(body.suggestions).toEqual([
				expect.objectContaining({
					artifactCreatedAt: seeded.newerCreatedAt.toISOString(),
					suggestedText: "latest version suggestion",
				}),
			])
		})

		it("returns the requested historical version suggestions when artifactCreatedAt is provided", async () => {
			const seeded = await seedVersionedSuggestions()
			mockGetAppSession.mockResolvedValue(
				createMockSession({
					user: {
						id: seeded.userId,
						type: "authenticated",
						email: `db-${seeded.userId}@example.com`,
					},
				}),
			)

			const response = await GET(
				new Request(
					`http://localhost/api/suggestions?artifactId=${seeded.artifactId}&artifactCreatedAt=${encodeURIComponent(
						seeded.olderCreatedAt.toISOString(),
					)}`,
				),
			)

			expect(response.status).toBe(200)
			const body = (await response.json()) as {
				suggestions: Array<{ artifactCreatedAt: string; suggestedText: string }>
			}

			expect(body.suggestions).toEqual([
				expect.objectContaining({
					artifactCreatedAt: seeded.olderCreatedAt.toISOString(),
					suggestedText: "first version suggestion",
				}),
			])
		})

		it("deletes only the requested artifact version suggestions", async () => {
			const seeded = await seedVersionedSuggestions()

			await deleteSuggestionsByArtifactVersion(seeded.artifactId, seeded.olderCreatedAt)

			await expect(
				getSuggestionsByArtifactVersion(seeded.artifactId, seeded.olderCreatedAt),
			).resolves.toEqual([])

			await expect(
				getSuggestionsByArtifactVersion(seeded.artifactId, seeded.newerCreatedAt),
			).resolves.toEqual([
				expect.objectContaining({
					artifactCreatedAt: seeded.newerCreatedAt,
					suggestedText: "latest version suggestion",
				}),
			])
		})
	},
)
