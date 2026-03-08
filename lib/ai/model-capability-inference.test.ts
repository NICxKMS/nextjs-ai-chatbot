// Flow: ai-model-selection | Step: reasoning-tag-resolution
import { describe, expect, it } from "vitest"

import { getReasoningTag, type ReasoningTag } from "@/lib/ai/model-capability-inference"

describe("getReasoningTag", () => {
	// ── Happy path — Google models ──

	it('returns { tagName: "thinking" } for google:gemini-2.5-flash', () => {
		expect(getReasoningTag("google:gemini-2.5-flash")).toEqual<ReasoningTag>({
			tagName: "thinking",
		})
	})

	it('returns { tagName: "thinking" } for google:gemini-2.5-pro', () => {
		expect(getReasoningTag("google:gemini-2.5-pro")).toEqual<ReasoningTag>({
			tagName: "thinking",
		})
	})

	it("matches any google:gemini-2.5 prefix variant", () => {
		expect(getReasoningTag("google:gemini-2.5-flash-lite")).toEqual<ReasoningTag>({
			tagName: "thinking",
		})
	})

	// ── Happy path — Google Gemini 3 models ──

	it('returns { tagName: "thinking" } for google:gemini-3-flash-preview', () => {
		expect(getReasoningTag("google:gemini-3-flash-preview")).toEqual<ReasoningTag>({
			tagName: "thinking",
		})
	})

	it('returns { tagName: "thinking" } for google:gemini-3.1-flash-lite-preview', () => {
		expect(getReasoningTag("google:gemini-3.1-flash-lite-preview")).toEqual<ReasoningTag>({
			tagName: "thinking",
		})
	})

	// ── Happy path — OpenAI models ──

	it('returns { tagName: "thinking" } for openai:o models', () => {
		expect(getReasoningTag("openai:o1")).toEqual<ReasoningTag>({ tagName: "thinking" })
		expect(getReasoningTag("openai:o3-mini")).toEqual<ReasoningTag>({ tagName: "thinking" })
	})

	// ── Happy path — DeepSeek models ──

	it('returns { tagName: "think" } for deepseek-r1 models', () => {
		expect(getReasoningTag("openrouter:deepseek/deepseek-r1")).toEqual<ReasoningTag>({
			tagName: "think",
		})
		expect(getReasoningTag("openrouter:deepseek/deepseek-r1:free")).toEqual<ReasoningTag>({
			tagName: "think",
		})
	})

	// ── Non-reasoning models return null ──

	it("returns null for non-reasoning models", () => {
		expect(getReasoningTag("openai:gpt-4o")).toBeNull()
		expect(getReasoningTag("google:gemma-3-4b-it")).toBeNull()
		expect(getReasoningTag("openrouter:anthropic/claude-3.5-sonnet")).toBeNull()
	})

	// ── Edge cases ──

	it("returns null for empty string", () => {
		expect(getReasoningTag("")).toBeNull()
	})

	it("returns null for unknown provider prefix", () => {
		expect(getReasoningTag("anthropic:claude-3.5-sonnet")).toBeNull()
	})

	it("returns null for partial matches that don't match prefix", () => {
		// "google:gemini-2.0" should NOT match "google:gemini-2.5"
		expect(getReasoningTag("google:gemini-2.0-flash")).toBeNull()
	})
})
