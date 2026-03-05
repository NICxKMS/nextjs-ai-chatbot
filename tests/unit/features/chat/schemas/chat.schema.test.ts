import { describe, expect, it } from "vitest"

import {
	chatRequestSchema,
	deleteMessagesSchema,
	editMessageSchema,
	messageSchema,
} from "@/features/chat/schemas/chat.schema"

const CHAT_ID = "11111111-1111-4111-8111-111111111111"
const MESSAGE_ID = "22222222-2222-4222-8222-222222222222"

describe("chatRequestSchema", () => {
	it("accepts a valid request with a text message part", () => {
		expect(() =>
			chatRequestSchema.parse({
				id: CHAT_ID,
				message: {
					id: MESSAGE_ID,
					role: "user",
					parts: [{ type: "text", text: "Hello" }],
				},
				selectedChatModel: "gpt-4o",
				selectedVisibilityType: "private",
			}),
		).not.toThrow()
	})

	it("accepts a valid request with a file part and settings", () => {
		expect(() =>
			chatRequestSchema.parse({
				id: CHAT_ID,
				message: {
					id: MESSAGE_ID,
					role: "user",
					parts: [
						{
							type: "file",
							mediaType: "text/plain",
							name: "notes.txt",
							url: "https://example.com/files/notes.txt",
						},
					],
				},
				selectedChatModel: "gpt-4o",
				selectedVisibilityType: "public",
				settings: {
					temperature: 1,
					topP: 0.8,
					maxOutputTokens: 4096,
					systemPrompt: "You are helpful.",
					enableReasoning: true,
					contextDisplayMode: "detailed",
				},
			}),
		).not.toThrow()
	})

	it("rejects invalid chat id", () => {
		expect(() =>
			chatRequestSchema.parse({
				id: "not-a-uuid",
				message: {
					id: MESSAGE_ID,
					role: "user",
					parts: [{ type: "text", text: "Hello" }],
				},
				selectedChatModel: "gpt-4o",
				selectedVisibilityType: "private",
			}),
		).toThrow()
	})

	it("rejects message role values other than user", () => {
		expect(() =>
			chatRequestSchema.parse({
				id: CHAT_ID,
				message: {
					id: MESSAGE_ID,
					role: "assistant",
					parts: [{ type: "text", text: "Hello" }],
				},
				selectedChatModel: "gpt-4o",
				selectedVisibilityType: "private",
			}),
		).toThrow()
	})

	it("rejects empty message parts", () => {
		expect(() =>
			chatRequestSchema.parse({
				id: CHAT_ID,
				message: {
					id: MESSAGE_ID,
					role: "user",
					parts: [],
				},
				selectedChatModel: "gpt-4o",
				selectedVisibilityType: "private",
			}),
		).toThrow()
	})

	it("rejects file parts with invalid URLs", () => {
		expect(() =>
			chatRequestSchema.parse({
				id: CHAT_ID,
				message: {
					id: MESSAGE_ID,
					role: "user",
					parts: [
						{
							type: "file",
							mediaType: "text/plain",
							name: "notes.txt",
							url: "not-a-url",
						},
					],
				},
				selectedChatModel: "gpt-4o",
				selectedVisibilityType: "private",
			}),
		).toThrow()
	})

	it("rejects invalid settings when provided", () => {
		expect(() =>
			chatRequestSchema.parse({
				id: CHAT_ID,
				message: {
					id: MESSAGE_ID,
					role: "user",
					parts: [{ type: "text", text: "Hello" }],
				},
				selectedChatModel: "gpt-4o",
				selectedVisibilityType: "private",
				settings: {
					temperature: 3,
					topP: 0.8,
					maxOutputTokens: 4096,
					systemPrompt: "prompt",
					enableReasoning: true,
					contextDisplayMode: "compact",
				},
			}),
		).toThrow()
	})
})

describe("messageSchema", () => {
	it("accepts valid roles and allows empty parts", () => {
		const parsed = messageSchema.parse({
			id: MESSAGE_ID,
			role: "assistant",
			parts: [],
		})

		expect(parsed.role).toBe("assistant")
		expect(parsed.parts).toEqual([])
	})

	it("rejects invalid message role", () => {
		expect(() =>
			messageSchema.parse({
				id: MESSAGE_ID,
				role: "tool",
				parts: [],
			}),
		).toThrow()
	})

	it("rejects text parts with empty text", () => {
		expect(() =>
			messageSchema.parse({
				id: MESSAGE_ID,
				role: "user",
				parts: [{ type: "text", text: "" }],
			}),
		).toThrow()
	})
})

describe("editMessageSchema", () => {
	it("accepts valid edit payload", () => {
		expect(() =>
			editMessageSchema.parse({
				chatId: CHAT_ID,
				messageId: MESSAGE_ID,
				content: "Updated message",
			}),
		).not.toThrow()
	})

	it("accepts the maximum content length", () => {
		expect(() =>
			editMessageSchema.parse({
				chatId: CHAT_ID,
				messageId: MESSAGE_ID,
				content: "a".repeat(10_000),
			}),
		).not.toThrow()
	})

	it("rejects empty content", () => {
		expect(() =>
			editMessageSchema.parse({
				chatId: CHAT_ID,
				messageId: MESSAGE_ID,
				content: "",
			}),
		).toThrow()
	})

	it("rejects content longer than 10_000 characters", () => {
		expect(() =>
			editMessageSchema.parse({
				chatId: CHAT_ID,
				messageId: MESSAGE_ID,
				content: "a".repeat(10_001),
			}),
		).toThrow()
	})
})

describe("deleteMessagesSchema", () => {
	it("accepts valid IDs", () => {
		expect(() =>
			deleteMessagesSchema.parse({
				chatId: CHAT_ID,
				messageId: MESSAGE_ID,
			}),
		).not.toThrow()
	})

	it("rejects invalid IDs", () => {
		expect(() =>
			deleteMessagesSchema.parse({
				chatId: "invalid",
				messageId: MESSAGE_ID,
			}),
		).toThrow()
	})
})
