// Flow: chat-validation | Step: request-schema
import { describe, expect, it } from "vitest"

import { chatRequestSchema, deleteMessagesSchema } from "@/features/chat/schemas/chat.schema"

// ── Helpers ──────────────────────────────────────────────────────

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"
const VALID_UUID_2 = "660e8400-e29b-41d4-a716-446655440001"

function validChatRequest(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_UUID,
		message: {
			id: VALID_UUID_2,
			role: "user",
			parts: [{ type: "text", text: "Hello" }],
		},
		selectedChatModel: "google:gemma-3-4b-it",
		selectedVisibilityType: "private",
		...overrides,
	}
}

// ── chatRequestSchema ────────────────────────────────────────────

describe("chatRequestSchema", () => {
	describe("valid inputs", () => {
		it("accepts a minimal valid request", () => {
			const result = chatRequestSchema.safeParse(validChatRequest())
			expect(result.success).toBe(true)
		})

		it("accepts a request with settings", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({
					settings: {
						temperature: 0.7,
						topP: 1,
						maxOutputTokens: 4096,
						systemPrompt: "",
						enableReasoning: false,
						contextDisplayMode: "compact",
					},
				}),
			)
			expect(result.success).toBe(true)
		})

		it("accepts public visibility", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({ selectedVisibilityType: "public" }),
			)
			expect(result.success).toBe(true)
		})

		it("accepts file parts in message", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({
					message: {
						id: VALID_UUID_2,
						role: "user",
						parts: [
							{ type: "text", text: "Look at this" },
							{
								type: "file",
								mediaType: "image/png",
								name: "photo.png",
								url: "https://example.com/photo.png",
							},
						],
					},
				}),
			)
			expect(result.success).toBe(true)
		})
	})

	describe("invalid inputs", () => {
		it("rejects non-UUID id", () => {
			const result = chatRequestSchema.safeParse(validChatRequest({ id: "not-a-uuid" }))
			expect(result.success).toBe(false)
		})

		it("rejects missing id", () => {
			const { id: _, ...noId } = validChatRequest()
			const result = chatRequestSchema.safeParse(noId)
			expect(result.success).toBe(false)
		})

		it("rejects non-user role in message", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({
					message: {
						id: VALID_UUID_2,
						role: "assistant",
						parts: [{ type: "text", text: "hello" }],
					},
				}),
			)
			expect(result.success).toBe(false)
		})

		it("rejects empty parts array", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({
					message: { id: VALID_UUID_2, role: "user", parts: [] },
				}),
			)
			expect(result.success).toBe(false)
		})

		it("rejects empty text in text part", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({
					message: {
						id: VALID_UUID_2,
						role: "user",
						parts: [{ type: "text", text: "" }],
					},
				}),
			)
			expect(result.success).toBe(false)
		})

		it("rejects empty selectedChatModel", () => {
			const result = chatRequestSchema.safeParse(validChatRequest({ selectedChatModel: "" }))
			expect(result.success).toBe(false)
		})

		it("rejects invalid visibility type", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({ selectedVisibilityType: "unlisted" }),
			)
			expect(result.success).toBe(false)
		})

		it("rejects non-UUID message id", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({
					message: {
						id: "bad-id",
						role: "user",
						parts: [{ type: "text", text: "hello" }],
					},
				}),
			)
			expect(result.success).toBe(false)
		})

		it("rejects file part with invalid url", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({
					message: {
						id: VALID_UUID_2,
						role: "user",
						parts: [
							{ type: "file", mediaType: "image/png", name: "f.png", url: "not-url" },
						],
					},
				}),
			)
			expect(result.success).toBe(false)
		})

		it("rejects completely wrong shape", () => {
			const result = chatRequestSchema.safeParse("string-input")
			expect(result.success).toBe(false)
		})

		it("rejects null", () => {
			const result = chatRequestSchema.safeParse(null)
			expect(result.success).toBe(false)
		})
	})

	describe("settings edge cases", () => {
		it("accepts request without settings (optional)", () => {
			const request = validChatRequest()
			const result = chatRequestSchema.safeParse(request)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.settings).toBeUndefined()
			}
		})

		it("rejects settings with out-of-range temperature", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({
					settings: {
						temperature: 3,
						topP: 1,
						maxOutputTokens: 4096,
						systemPrompt: "",
						enableReasoning: false,
						contextDisplayMode: "compact",
					},
				}),
			)
			expect(result.success).toBe(false)
		})

		it("rejects settings with negative temperature", () => {
			const result = chatRequestSchema.safeParse(
				validChatRequest({
					settings: {
						temperature: -1,
						topP: 1,
						maxOutputTokens: 4096,
						systemPrompt: "",
						enableReasoning: false,
						contextDisplayMode: "compact",
					},
				}),
			)
			expect(result.success).toBe(false)
		})
	})
})

// ── deleteMessagesSchema ─────────────────────────────────────────

describe("deleteMessagesSchema", () => {
	it("accepts valid chat and message UUIDs", () => {
		const result = deleteMessagesSchema.safeParse({
			chatId: VALID_UUID,
			messageId: VALID_UUID_2,
		})
		expect(result.success).toBe(true)
	})

	it("rejects non-UUID chatId", () => {
		const result = deleteMessagesSchema.safeParse({
			chatId: "bad",
			messageId: VALID_UUID,
		})
		expect(result.success).toBe(false)
	})

	it("rejects non-UUID messageId", () => {
		const result = deleteMessagesSchema.safeParse({
			chatId: VALID_UUID,
			messageId: "bad",
		})
		expect(result.success).toBe(false)
	})

	it("rejects missing chatId", () => {
		const result = deleteMessagesSchema.safeParse({ messageId: VALID_UUID })
		expect(result.success).toBe(false)
	})

	it("rejects missing messageId", () => {
		const result = deleteMessagesSchema.safeParse({ chatId: VALID_UUID })
		expect(result.success).toBe(false)
	})

	it("rejects empty object", () => {
		const result = deleteMessagesSchema.safeParse({})
		expect(result.success).toBe(false)
	})

	it("rejects null", () => {
		const result = deleteMessagesSchema.safeParse(null)
		expect(result.success).toBe(false)
	})
})
