import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	revalidateTag: vi.fn(),
	updateTag: vi.fn(),
}))

vi.mock("next/cache", () => ({
	cacheLife: mocks.cacheLife,
	cacheTag: mocks.cacheTag,
	revalidateTag: mocks.revalidateTag,
	updateTag: mocks.updateTag,
}))

import { getTableName } from "drizzle-orm"
import { cacheKeys, rateLimitKeys } from "@/lib/cache/keys"
import {
	invalidateChat,
	invalidateChatList,
	invalidateVotes,
	refreshChat,
	refreshChatList,
	refreshVotes,
} from "@/lib/cache/revalidate"
import { withCache } from "@/lib/cache/with-cache"
import { requireDatabaseRow, throwDatabaseError } from "@/lib/data/database-error"
import {
	artifactKindEnum,
	artifacts,
	chats,
	messages,
	roleEnum,
	suggestions,
	users,
	visibilityEnum,
	votes,
} from "@/lib/db/schema"
import { AppError } from "@/lib/errors/app-error"

describe("data persistence and cache integration contracts", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("keeps schema table and enum identities stable for persistence helpers", () => {
		expect(getTableName(users)).toBe("User")
		expect(getTableName(chats)).toBe("Chat")
		expect(getTableName(messages)).toBe("Message_v2")
		expect(getTableName(votes)).toBe("Vote_v2")
		expect(getTableName(artifacts)).toBe("Artifact")
		expect(getTableName(suggestions)).toBe("Suggestion")
		expect(visibilityEnum.enumValues).toEqual(["public", "private"])
		expect(roleEnum.enumValues).toEqual(["user", "assistant", "system"])
		expect(artifactKindEnum.enumValues).toEqual(["text", "code", "image", "sheet"])
	})

	it("builds cache and rate-limit keys used across route/action persistence flows", () => {
		expect(cacheKeys.chat("chat-1")).toBe("chat:chat-1")
		expect(cacheKeys.chats("user-1")).toBe("chats:user-1")
		expect(cacheKeys.votes("chat-1")).toBe("votes:chat-1")
		expect(cacheKeys.models()).toBe("models")
		expect(rateLimitKeys.rateLimitDaily("user-1")).toBe("rate-limit-daily:user-1")
		expect(rateLimitKeys.rateLimitChat("user-1")).toBe("rate-limit-chat:user-1")
		expect(rateLimitKeys.rateLimitUpload("user-1")).toBe("rate-limit-upload:user-1")
		expect(rateLimitKeys.rateLimitVote("user-1")).toBe("rate-limit-vote:user-1")
	})

	it("applies cache tags/lifetimes before resolving cached fetchers", async () => {
		const fetcher = vi.fn().mockResolvedValue({ id: "chat-1" })

		await expect(withCache(cacheKeys.chat("chat-1"), fetcher, "seconds")).resolves.toEqual({
			id: "chat-1",
		})

		expect(mocks.cacheTag).toHaveBeenCalledWith("chat:chat-1")
		expect(mocks.cacheLife).toHaveBeenCalledWith("seconds")
		expect(fetcher).toHaveBeenCalledTimes(1)
	})

	it("uses updateTag for action invalidation and revalidateTag for route refresh", () => {
		invalidateChat("chat-1")
		invalidateChatList("user-1")
		invalidateVotes("chat-1")
		refreshChat("chat-2")
		refreshChatList("user-2")
		refreshVotes("chat-2")

		expect(mocks.updateTag).toHaveBeenCalledWith("chat:chat-1")
		expect(mocks.updateTag).toHaveBeenCalledWith("chats:user-1")
		expect(mocks.updateTag).toHaveBeenCalledWith("votes:chat-1")
		expect(mocks.revalidateTag).toHaveBeenCalledWith("chat:chat-2", "max")
		expect(mocks.revalidateTag).toHaveBeenCalledWith("chats:user-2", "max")
		expect(mocks.revalidateTag).toHaveBeenCalledWith("votes:chat-2", "max")
	})

	it("normalizes database helper edge cases into AppError contracts", () => {
		const existing = { id: "row-1" }
		expect(requireDatabaseRow(existing, "missing")).toBe(existing)
		expect(() => requireDatabaseRow(undefined, "missing row", { id: "row-2" })).toThrow(
			AppError,
		)
		expect(() =>
			throwDatabaseError(new Error("db down"), "Failed to query", { chatId: "chat-1" }),
		).toThrow(AppError)
	})

	it("fails open for rate limits by default when Redis is not configured", async () => {
		vi.resetModules()
		vi.stubEnv("CACHE_KV_REST_API_URL", "")
		vi.stubEnv("CACHE_KV_REST_API_TOKEN", "")

		const { checkRateLimit, checkRateLimitWithInfo } = await import("@/lib/cache/rate-limit")

		await expect(checkRateLimit("user-1", 1, 60)).resolves.toBe(true)
		await expect(checkRateLimitWithInfo("user-1", 1, 60)).resolves.toEqual({
			allowed: true,
		})
		await expect(checkRateLimit("user-1", 1, 60, { failureMode: "block" })).resolves.toBe(false)
		await expect(
			checkRateLimitWithInfo("user-1", 1, 60, { failureMode: "block" }),
		).resolves.toEqual({ allowed: false })

		vi.unstubAllEnvs()
	})

	it("keeps chat/message persistence writes inside explicit transaction boundaries", async () => {
		const source = await readProjectFile("lib/data/chat.ts")

		expect(extractFunctionSource(source, "createChatWithInitialMessage")).toEqual(
			expect.stringContaining("db.transaction"),
		)
		expect(extractFunctionSource(source, "createChatWithInitialMessage")).toEqual(
			expect.stringContaining("tx.insert(messages).values(data.message)"),
		)
		expect(extractFunctionSource(source, "saveMessagesAndTouchChat")).toEqual(
			expect.stringContaining("db.transaction"),
		)
		expect(extractFunctionSource(source, "saveMessagesAndTouchChat")).toEqual(
			expect.stringContaining("tx.insert(messages).values(data.messages)"),
		)
		expect(extractFunctionSource(source, "saveMessagesAndTouchChat")).toEqual(
			expect.stringContaining("tx"),
		)
	})

	it("keeps edit trailing-message deletion scoped and atomic", async () => {
		const source = await readProjectFile("lib/data/message.ts")
		const deleteTrailingSource = extractFunctionSource(source, "deleteMessagesByIdAfter")

		expect(deleteTrailingSource).toEqual(expect.stringContaining("db.transaction"))
		expect(deleteTrailingSource).toEqual(
			expect.stringContaining(
				"where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)))",
			),
		)
		expect(deleteTrailingSource).toEqual(expect.stringContaining("if (!targetMessage) return"))
		expect(deleteTrailingSource).toEqual(expect.stringContaining("eq(messages.chatId, chatId)"))
		expect(deleteTrailingSource).toEqual(
			expect.stringContaining("gte(messages.createdAt, targetMessage.createdAt)"),
		)
		expect(deleteTrailingSource).toEqual(expect.stringContaining("throwDatabaseError"))
	})

	it("keeps artifact versions and suggestions on public versioning contracts", async () => {
		const [artifactSource, suggestionSource] = await Promise.all([
			readProjectFile("lib/data/artifact.ts"),
			readProjectFile("lib/data/suggestion.ts"),
		])

		expect(extractFunctionSource(artifactSource, "getArtifactById")).toEqual(
			expect.stringContaining("orderBy(desc(artifacts.createdAt))"),
		)
		expect(extractFunctionSource(artifactSource, "saveArtifactVersion")).toEqual(
			expect.stringContaining("returning()"),
		)
		expect(extractFunctionSource(artifactSource, "deleteArtifactVersionsAfter")).toEqual(
			expect.stringContaining("gt(artifacts.createdAt, createdAt)"),
		)
		expect(extractFunctionSource(suggestionSource, "getSuggestionsByArtifactVersion")).toEqual(
			expect.stringContaining("eq(suggestions.artifactCreatedAt, artifactCreatedAt)"),
		)
		expect(extractFunctionSource(suggestionSource, "saveSuggestions")).toEqual(
			expect.stringContaining("if (data.length === 0) return []"),
		)
	})

	it("guards sidebar history pagination contract without asserting private SQL objects", async () => {
		const source = await readProjectFile("lib/data/chat.ts")
		const paginationSource = extractFunctionSource(source, "getChatsByUserId")

		expect(source).toEqual(expect.stringContaining("const DEFAULT_PAGE_SIZE = 20"))
		expect(paginationSource).toEqual(expect.stringContaining("limit + 1"))
		expect(paginationSource).toEqual(
			expect.stringContaining("hasMore && lastChat ? lastChat.id"),
		)
		expect(paginationSource).toEqual(
			expect.stringContaining("orderBy(desc(chats.updatedAt), desc(chats.id))"),
		)
		expect(paginationSource).toEqual(expect.stringContaining("eq(chats.userId, userId)"))
	})

	it("uses Upstash sliding-window rate limits behind an environment-gated fallback", async () => {
		const source = await readProjectFile("lib/cache/rate-limit.ts")

		expect(source).toEqual(expect.stringContaining("Ratelimit.slidingWindow(limit"))
		expect(source).toEqual(expect.stringContaining('prefix: "@app/ratelimit"'))
		expect(source).toEqual(expect.stringContaining("if (!url || !token) return null"))
		expect(source).toEqual(
			expect.stringContaining('if (!limiter) return { allowed: failureMode === "allow" }'),
		)
		expect(source).toEqual(
			expect.stringContaining('return { allowed: failureMode === "allow" }'),
		)
	})
})

async function readProjectFile(relativePath: string): Promise<string> {
	return readFile(join(process.cwd(), relativePath), "utf8")
}

function extractFunctionSource(source: string, functionName: string): string {
	const start = source.indexOf(`export async function ${functionName}`)
	expect(start, `${functionName} should be exported`).toBeGreaterThanOrEqual(0)

	const nextExport = source.indexOf("\nexport ", start + 1)
	return source.slice(start, nextExport === -1 ? undefined : nextExport)
}
