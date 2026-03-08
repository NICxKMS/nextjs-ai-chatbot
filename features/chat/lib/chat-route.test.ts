// Flow: chat-api-pipeline | Step: route-orchestration
import type { LanguageModelUsage } from "ai"
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest"

import {
	CHAT_PERSISTENCE_FAILURE_SIGNAL,
	enforceChatRateLimit,
	readChatRequest,
	requireChatSession,
	serializeUsage,
} from "@/features/chat/lib/chat-route"
import { getAppSession } from "@/lib/auth/session"
import { checkRateLimit } from "@/lib/cache/rate-limit"

// ── Mocks ────────────────────────────────────────────────────────
// Must be declared before importing the module under test.

vi.mock("@/lib/auth/session", () => ({
	getAppSession: vi.fn(),
}))

vi.mock("@/lib/cache/rate-limit", () => ({
	checkRateLimit: vi.fn(),
}))

vi.mock("@/lib/cache/keys", () => ({
	rateLimitKeys: {
		rateLimitChat: (userId: string) => `rate-limit-chat:${userId}`,
	},
}))

vi.mock("@/lib/cache/revalidate", () => ({
	refreshChat: vi.fn(),
	refreshChatList: vi.fn(),
}))

vi.mock("@/lib/data/chat", () => ({
	getChatById: vi.fn(),
	createChatWithInitialMessage: vi.fn(),
	saveMessagesAndTouchChat: vi.fn(),
}))

vi.mock("@/lib/data/message", () => ({
	getMessagesForChatRender: vi.fn(),
	saveMessages: vi.fn(),
}))

vi.mock("@/lib/data/user", () => ({
	ensureGuestUser: vi.fn(),
}))

vi.mock("@/features/models/lib/models", () => ({
	getAvailableModels: vi.fn(),
}))

vi.mock("@/lib/ai/tools", () => ({
	getEnabledTools: vi.fn().mockReturnValue([]),
}))

vi.mock("@/features/chat/lib/tools/create-artifact", () => ({
	createArtifactTool: vi.fn(),
}))

vi.mock("@/features/chat/lib/tools/update-artifact", () => ({
	updateArtifactTool: vi.fn(),
}))

vi.mock("@/features/chat/lib/tools/request-suggestions", () => ({
	requestSuggestionsTool: vi.fn(),
}))

vi.mock("@/features/chat/lib/tools/weather", () => ({
	getWeather: { execute: vi.fn() },
}))

vi.mock("@/lib/utils/generate-uuid", () => ({
	generateUUID: vi.fn().mockReturnValue("recovery-uuid"),
}))

// ── Usage helper ─────────────────────────────────────────────────

const TOKEN_DETAILS_DEFAULTS = {
	inputTokenDetails: {
		noCacheTokens: undefined,
		cacheReadTokens: undefined,
		cacheWriteTokens: undefined,
	},
	outputTokenDetails: {
		textTokens: undefined,
		reasoningTokens: undefined,
	},
} as const

function mockUsage(overrides: Partial<LanguageModelUsage>): LanguageModelUsage {
	return {
		inputTokens: 0,
		outputTokens: 0,
		totalTokens: 0,
		...TOKEN_DETAILS_DEFAULTS,
		...overrides,
	}
}

// ── CHAT_PERSISTENCE_FAILURE_SIGNAL ──────────────────────────────

describe("CHAT_PERSISTENCE_FAILURE_SIGNAL", () => {
	it("is a non-empty string constant", () => {
		expect(typeof CHAT_PERSISTENCE_FAILURE_SIGNAL).toBe("string")
		expect(CHAT_PERSISTENCE_FAILURE_SIGNAL.length).toBeGreaterThan(0)
	})
})

// ── serializeUsage ───────────────────────────────────────────────

describe("serializeUsage", () => {
	it("serializes full usage object to JSON", () => {
		const usage = mockUsage({
			inputTokens: 100,
			outputTokens: 50,
			totalTokens: 150,
			reasoningTokens: 20,
			cachedInputTokens: 10,
		})
		const result = serializeUsage(usage)
		const parsed = JSON.parse(result)
		expect(parsed).toEqual({
			inputTokens: 100,
			outputTokens: 50,
			totalTokens: 150,
			reasoningTokens: 20,
			cachedInputTokens: 10,
		})
	})

	it("handles undefined optional fields", () => {
		const usage = mockUsage({
			inputTokens: 10,
			outputTokens: 5,
			totalTokens: 15,
			reasoningTokens: undefined,
			cachedInputTokens: undefined,
		})
		const result = serializeUsage(usage)
		const parsed = JSON.parse(result)
		expect(parsed.inputTokens).toBe(10)
		expect(parsed.outputTokens).toBe(5)
		expect(parsed.totalTokens).toBe(15)
	})

	it("handles zero values", () => {
		const usage = mockUsage({
			inputTokens: 0,
			outputTokens: 0,
			totalTokens: 0,
			reasoningTokens: 0,
			cachedInputTokens: 0,
		})
		const result = serializeUsage(usage)
		const parsed = JSON.parse(result)
		expect(parsed.inputTokens).toBe(0)
		expect(parsed.totalTokens).toBe(0)
	})

	it("returns a valid JSON string", () => {
		const usage = mockUsage({
			inputTokens: 1,
			outputTokens: 2,
			totalTokens: 3,
			reasoningTokens: 0,
			cachedInputTokens: 0,
		})
		expect(() => JSON.parse(serializeUsage(usage))).not.toThrow()
	})
})

// ── requireChatSession ───────────────────────────────────────────

describe("requireChatSession", () => {
	const mockGetAppSession = getAppSession as unknown as MockInstance

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns session when user is authenticated", async () => {
		const session = { user: { id: "user-1", type: "authenticated" } }
		mockGetAppSession.mockResolvedValue(session)

		const result = await requireChatSession()
		expect(result).toEqual(session)
	})

	it("returns session when user is a guest", async () => {
		const session = { user: { id: "guest-1", type: "guest" } }
		mockGetAppSession.mockResolvedValue(session)

		const result = await requireChatSession()
		expect(result).toEqual(session)
	})

	it("returns 401 Response when session is null", async () => {
		mockGetAppSession.mockResolvedValue(null)

		const result = await requireChatSession()
		expect(result).toBeInstanceOf(Response)

		const res = result as Response
		expect(res.status).toBe(401)
		const body = await res.json()
		expect(body.code).toMatch(/unauthorized/)
	})

	it("returns 401 Response when session has no user", async () => {
		mockGetAppSession.mockResolvedValue({ user: null })

		const result = await requireChatSession()
		expect(result).toBeInstanceOf(Response)
		expect((result as Response).status).toBe(401)
	})
})

// ── enforceChatRateLimit ─────────────────────────────────────────

describe("enforceChatRateLimit", () => {
	const mockCheckRateLimit = checkRateLimit as unknown as MockInstance

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns null when rate limit is not exceeded", async () => {
		mockCheckRateLimit.mockResolvedValue(true)

		const result = await enforceChatRateLimit("user-1")
		expect(result).toBeNull()
	})

	it("returns 429 Response when rate limit is exceeded", async () => {
		mockCheckRateLimit.mockResolvedValue(false)

		const result = await enforceChatRateLimit("user-1")
		expect(result).toBeInstanceOf(Response)

		const res = result as Response
		expect(res.status).toBe(429)
		const body = await res.json()
		expect(body.code).toMatch(/rate_limit/)
	})

	it("calls checkRateLimit with correct key and parameters", async () => {
		mockCheckRateLimit.mockResolvedValue(true)

		await enforceChatRateLimit("user-42")
		expect(mockCheckRateLimit).toHaveBeenCalledWith("rate-limit-chat:user-42", 20, 60)
	})
})

// ── readChatRequest ──────────────────────────────────────────────

describe("readChatRequest", () => {
	function mockRequest(body: unknown): Request {
		return new Request("http://localhost/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		})
	}

	function invalidJsonRequest(): Request {
		return new Request("http://localhost/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "not-json{{{",
		})
	}

	const validBody = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		message: {
			id: "660e8400-e29b-41d4-a716-446655440001",
			role: "user",
			parts: [{ type: "text", text: "Hello" }],
		},
		selectedChatModel: "google:gemma-3-4b-it",
		selectedVisibilityType: "private",
	}

	it("returns parsed ChatRequest for valid body", async () => {
		const result = await readChatRequest(mockRequest(validBody))
		expect(result).not.toBeInstanceOf(Response)
		expect(result).toHaveProperty("id", validBody.id)
		expect(result).toHaveProperty("selectedChatModel", "google:gemma-3-4b-it")
	})

	it("returns 400 Response for invalid JSON", async () => {
		const result = await readChatRequest(invalidJsonRequest())
		expect(result).toBeInstanceOf(Response)

		const res = result as Response
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.code).toMatch(/bad_request/)
	})

	it("returns 400 Response for invalid schema", async () => {
		const result = await readChatRequest(mockRequest({ wrong: "shape" }))
		expect(result).toBeInstanceOf(Response)
		expect((result as Response).status).toBe(400)
	})

	it("returns 400 Response for missing required fields", async () => {
		const result = await readChatRequest(mockRequest({ id: "not-uuid" }))
		expect(result).toBeInstanceOf(Response)
		expect((result as Response).status).toBe(400)
	})
})
