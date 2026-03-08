// Flow: chat-title-generation | Step: title-ai-call

import { describe, expect, it, vi } from "vitest"

// Mock AI SDK's generateText before importing the module under test
vi.mock("ai", () => ({
	generateText: vi.fn(),
}))

// Mock internal model resolution to avoid provider configuration checks
vi.mock("@/lib/ai/internal-models", () => ({
	getInternalLanguageModel: vi.fn(() => "mock-model"),
}))

import { generateText } from "ai"
import { generateTitle } from "@/lib/ai/title"

const mockGenerateText = vi.mocked(generateText)

// ── generateTitle ────────────────────────────────────────────

describe("generateTitle", () => {
	it("calls generateText with title system prompt and user message", async () => {
		mockGenerateText.mockResolvedValue({
			text: "My Chat Title",
		} as Awaited<ReturnType<typeof generateText>>)

		await generateTitle("Hello, can you help me with TypeScript?")

		expect(mockGenerateText).toHaveBeenCalledOnce()
		expect(mockGenerateText).toHaveBeenCalledWith(
			expect.objectContaining({
				model: "mock-model",
				prompt: "Hello, can you help me with TypeScript?",
				system: expect.stringContaining("short title"),
			}),
		)
	})

	it("returns the generated title trimmed", async () => {
		mockGenerateText.mockResolvedValue({
			text: "  A Good Title  ",
		} as Awaited<ReturnType<typeof generateText>>)

		const result = await generateTitle("Tell me about Rust")
		expect(result).toBe("A Good Title")
	})

	it("truncates titles longer than 80 characters", async () => {
		const longTitle = "A".repeat(120)
		mockGenerateText.mockResolvedValue({
			text: longTitle,
		} as Awaited<ReturnType<typeof generateText>>)

		const result = await generateTitle("some message")
		expect(result.length).toBeLessThanOrEqual(80)
	})

	it("falls back to message excerpt when generateText returns empty string", async () => {
		mockGenerateText.mockResolvedValue({
			text: "",
		} as Awaited<ReturnType<typeof generateText>>)

		const result = await generateTitle("Hello world, this is my first message")
		expect(result).toBe("Hello world, this is my first message")
	})

	it("falls back to message excerpt when generateText throws", async () => {
		mockGenerateText.mockRejectedValue(new Error("API timeout"))

		const result = await generateTitle("My question about React hooks")
		expect(result).toBe("My question about React hooks")
	})

	it("falls back to 'New Chat' when both AI and message are empty", async () => {
		mockGenerateText.mockRejectedValue(new Error("fail"))

		const result = await generateTitle("")
		expect(result).toBe("New Chat")
	})

	it("falls back to 'New Chat' when message is whitespace-only and AI fails", async () => {
		mockGenerateText.mockRejectedValue(new Error("fail"))

		const result = await generateTitle("   ")
		expect(result).toBe("New Chat")
	})

	it("truncates fallback message to 80 characters", async () => {
		mockGenerateText.mockRejectedValue(new Error("fail"))

		const longMessage = "B".repeat(200)
		const result = await generateTitle(longMessage)
		expect(result.length).toBeLessThanOrEqual(80)
	})

	it("includes AbortSignal.timeout in call options", async () => {
		mockGenerateText.mockResolvedValue({
			text: "Title",
		} as Awaited<ReturnType<typeof generateText>>)

		await generateTitle("test")

		expect(mockGenerateText).toHaveBeenCalledWith(
			expect.objectContaining({
				abortSignal: expect.any(AbortSignal),
			}),
		)
	})
})
