import { describe, expect, it } from "vitest"

import {
	artifactPostBodySchema,
	getArtifactSchema,
} from "@/features/artifacts/schemas/artifact.schema"
import { loginSchema, registerSchema } from "@/features/auth/schemas/auth.schema"
import { chatRequestSchema } from "@/features/chat/schemas/chat.schema"
import { settingsSchema } from "@/features/settings/schemas/settings.schema"
import { updateVisibilitySchema } from "@/features/visibility/types/visibility.types"
import { voteSchema } from "@/features/voting/types/vote.types"

const chatId = "11111111-1111-4111-8111-111111111111"
const messageId = "22222222-2222-4222-8222-222222222222"
const artifactId = "33333333-3333-4333-8333-333333333333"

describe("plan-aligned schemas", () => {
	it("validates auth credentials", () => {
		expect(
			loginSchema.safeParse({ email: "user@example.com", password: "secret1" }).success,
		).toBe(true)
		expect(registerSchema.safeParse({ email: "bad", password: "short" }).success).toBe(false)
	})

	it("enforces settings bounds", () => {
		expect(
			settingsSchema.safeParse({
				temperature: 1,
				topP: 0.5,
				maxOutputTokens: 4096,
				systemPrompt: "Be concise",
				enableReasoning: true,
			}).success,
		).toBe(true)
		expect(
			settingsSchema.safeParse({
				temperature: 3,
				topP: 2,
				maxOutputTokens: 1,
				systemPrompt: "",
				enableReasoning: false,
			}).success,
		).toBe(false)
	})

	it("accepts chat requests with trusted uploaded file parts", () => {
		const result = chatRequestSchema.safeParse({
			id: chatId,
			message: {
				id: messageId,
				role: "user",
				parts: [
					{ type: "text", text: "Explain this image" },
					{
						type: "file",
						mediaType: "image/png",
						name: "image.png",
						url: "https://abc.public.blob.vercel-storage.com/uploads/image.png",
					},
				],
			},
			selectedChatModel: "google:gemma-3-4b-it",
			selectedVisibilityType: "private",
		})

		expect(result.success).toBe(true)
	})

	it("rejects untrusted chat file URLs", () => {
		const result = chatRequestSchema.safeParse({
			id: chatId,
			message: {
				id: messageId,
				role: "user",
				parts: [
					{
						type: "file",
						mediaType: "image/png",
						name: "image.png",
						url: "https://example.com/uploads/image.png",
					},
				],
			},
			selectedChatModel: "google:gemma-3-4b-it",
			selectedVisibilityType: "private",
		})

		expect(result.success).toBe(false)
	})

	it("validates artifact save and restore modes", () => {
		expect(
			artifactPostBodySchema.safeParse({
				mode: "save",
				id: artifactId,
				title: "Draft",
				content: "hello",
				kind: "text",
				chatId,
			}).success,
		).toBe(true)
		expect(
			artifactPostBodySchema.safeParse({
				mode: "restore",
				id: artifactId,
				timestamp: "2026-05-01T00:00:00.000Z",
			}).success,
		).toBe(true)
		expect(getArtifactSchema.safeParse({ id: artifactId, view: "latest" }).success).toBe(true)
	})

	it("validates visibility and voting contracts", () => {
		expect(updateVisibilitySchema.safeParse({ chatId, visibility: "public" }).success).toBe(
			true,
		)
		expect(updateVisibilitySchema.safeParse({ chatId, visibility: "shared" }).success).toBe(
			false,
		)
		expect(voteSchema.safeParse({ chatId, messageId, type: "up" }).success).toBe(true)
		expect(voteSchema.safeParse({ chatId, messageId, type: "sideways" }).success).toBe(false)
	})
})
