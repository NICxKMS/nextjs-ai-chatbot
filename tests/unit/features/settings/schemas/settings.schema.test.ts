import { describe, expect, it } from "vitest"

import { settingsSchema } from "@/features/settings/schemas/settings.schema"

const VALID_SETTINGS = {
	temperature: 1,
	topP: 0.9,
	maxOutputTokens: 1024,
	systemPrompt: "You are a concise assistant.",
	enableReasoning: true,
	contextDisplayMode: "detailed" as const,
}

describe("settingsSchema", () => {
	it("accepts valid settings", () => {
		const parsed = settingsSchema.parse(VALID_SETTINGS)

		expect(parsed).toEqual(VALID_SETTINGS)
	})

	it("applies default contextDisplayMode when omitted", () => {
		const parsed = settingsSchema.parse({
			temperature: 1,
			topP: 0.9,
			maxOutputTokens: 1024,
			systemPrompt: "You are a concise assistant.",
			enableReasoning: false,
		})

		expect(parsed.contextDisplayMode).toBe("compact")
	})

	it("rejects temperature values outside 0..2", () => {
		expect(() =>
			settingsSchema.parse({
				...VALID_SETTINGS,
				temperature: -0.1,
			}),
		).toThrow()

		expect(() =>
			settingsSchema.parse({
				...VALID_SETTINGS,
				temperature: 2.1,
			}),
		).toThrow()
	})

	it("rejects topP values outside 0..1", () => {
		expect(() =>
			settingsSchema.parse({
				...VALID_SETTINGS,
				topP: -0.01,
			}),
		).toThrow()

		expect(() =>
			settingsSchema.parse({
				...VALID_SETTINGS,
				topP: 1.01,
			}),
		).toThrow()
	})

	it("rejects non-integer maxOutputTokens", () => {
		expect(() =>
			settingsSchema.parse({
				...VALID_SETTINGS,
				maxOutputTokens: 1024.5,
			}),
		).toThrow()
	})

	it("rejects maxOutputTokens outside 256..1_000_000", () => {
		expect(() =>
			settingsSchema.parse({
				...VALID_SETTINGS,
				maxOutputTokens: 255,
			}),
		).toThrow()

		expect(() =>
			settingsSchema.parse({
				...VALID_SETTINGS,
				maxOutputTokens: 1_000_001,
			}),
		).toThrow()
	})

	it("rejects system prompts longer than 8192 characters", () => {
		expect(() =>
			settingsSchema.parse({
				...VALID_SETTINGS,
				systemPrompt: "a".repeat(8193),
			}),
		).toThrow()
	})

	it("rejects invalid context display modes", () => {
		expect(() =>
			settingsSchema.parse({
				...VALID_SETTINGS,
				contextDisplayMode: "full",
			}),
		).toThrow()
	})

	it("rejects non-boolean enableReasoning", () => {
		expect(() =>
			settingsSchema.parse({
				...VALID_SETTINGS,
				enableReasoning: "yes",
			}),
		).toThrow()
	})
})
