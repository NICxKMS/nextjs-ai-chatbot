import type { LanguageModelV2, LanguageModelV2StreamPart } from "@ai-sdk/provider"
import { simulateReadableStream } from "ai"
import { MockLanguageModelV2 } from "ai/test"

// ── Default usage stats ─────────────────────────────────────

const DEFAULT_USAGE = { inputTokens: 10, outputTokens: 20, totalTokens: 30 }

// ── createMockTextModel ─────────────────────────────────────

/**
 * Create a mock model that returns a fixed text response.
 * Supports both `generateText` (doGenerate) and `streamText` (doStream).
 *
 * Uses `MockLanguageModelV2` from `ai/test` under the hood.
 *
 * @example
 * ```ts
 * const model = createMockTextModel("Hello! I'm a mock assistant.")
 * const result = streamText({ model, prompt: "Hi" })
 * ```
 */
export function createMockTextModel(text: string): LanguageModelV2 {
	return new MockLanguageModelV2({
		doGenerate: async () => ({
			finishReason: "stop",
			usage: DEFAULT_USAGE,
			content: [{ type: "text", text }],
			warnings: [],
		}),
		doStream: async () => ({
			stream: simulateReadableStream({
				chunks: [
					{ type: "text-start", id: "text-0" },
					...splitTextToDeltas(text, "text-0"),
					{ type: "text-end", id: "text-0" },
					{
						type: "finish",
						finishReason: "stop",
						usage: DEFAULT_USAGE,
					},
				] satisfies LanguageModelV2StreamPart[],
				initialDelayInMs: null,
				chunkDelayInMs: null,
			}),
		}),
	})
}

// ── createMockStreamModel ───────────────────────────────────

/**
 * Create a mock model for streaming with custom text chunks.
 * Each string in the `chunks` array becomes a separate `text-delta`.
 *
 * Only provides `doStream` — use for `streamText` / `streamObject` tests.
 *
 * @example
 * ```ts
 * const model = createMockStreamModel(["Hello", ", ", "world!"])
 * const result = streamText({ model, prompt: "Hi" })
 * ```
 */
export function createMockStreamModel(chunks: string[]): LanguageModelV2 {
	return new MockLanguageModelV2({
		doStream: async () => ({
			stream: simulateReadableStream({
				chunks: [
					{ type: "text-start", id: "text-0" },
					...chunks.map((delta) => ({
						type: "text-delta" as const,
						id: "text-0",
						delta,
					})),
					{ type: "text-end", id: "text-0" },
					{
						type: "finish",
						finishReason: "stop",
						usage: DEFAULT_USAGE,
					},
				] satisfies LanguageModelV2StreamPart[],
				initialDelayInMs: null,
				chunkDelayInMs: null,
			}),
		}),
	})
}

// ── createMockToolCallModel ─────────────────────────────────

/**
 * Create a mock model that simulates a specific tool call.
 * The model returns a tool-call on the first invocation, then a text
 * response on subsequent invocations (simulating the tool result step).
 *
 * Uses `MockLanguageModelV2` from `ai/test` under the hood.
 *
 * @example
 * ```ts
 * const model = createMockToolCallModel({
 *   toolName: "createArtifact",
 *   toolCallId: "call-1",
 *   args: { title: "My Code", kind: "code" },
 *   followUpText: "I've created the artifact for you.",
 * })
 * ```
 */
export function createMockToolCallModel(config: {
	toolName: string
	toolCallId?: string
	args: Record<string, unknown>
	followUpText?: string
}): LanguageModelV2 {
	const toolCallId = config.toolCallId ?? `call-${crypto.randomUUID().slice(0, 8)}`
	const argsJson = JSON.stringify(config.args)
	const followUp = config.followUpText ?? "Done."
	let callCount = 0

	return new MockLanguageModelV2({
		doGenerate: async () => {
			callCount++
			if (callCount === 1) {
				return {
					finishReason: "tool-calls" as const,
					usage: DEFAULT_USAGE,
					content: [
						{
							type: "tool-call" as const,
							toolCallId,
							toolName: config.toolName,
							input: argsJson,
						},
					],
					warnings: [],
				}
			}
			return {
				finishReason: "stop" as const,
				usage: DEFAULT_USAGE,
				content: [{ type: "text" as const, text: followUp }],
				warnings: [],
			}
		},
		doStream: async () => {
			callCount++
			if (callCount === 1) {
				return {
					stream: simulateReadableStream({
						chunks: [
							{
								type: "tool-input-start",
								id: toolCallId,
								toolName: config.toolName,
							},
							{ type: "tool-input-delta", id: toolCallId, delta: argsJson },
							{ type: "tool-input-end", id: toolCallId },
							{
								type: "tool-call",
								toolCallId,
								toolName: config.toolName,
								input: argsJson,
							},
							{
								type: "finish",
								finishReason: "tool-calls",
								usage: DEFAULT_USAGE,
							},
						] satisfies LanguageModelV2StreamPart[],
						initialDelayInMs: null,
						chunkDelayInMs: null,
					}),
				}
			}
			return {
				stream: simulateReadableStream({
					chunks: [
						{ type: "text-start", id: "text-0" },
						{ type: "text-delta", id: "text-0", delta: followUp },
						{ type: "text-end", id: "text-0" },
						{
							type: "finish",
							finishReason: "stop",

							usage: DEFAULT_USAGE,
						},
					] satisfies LanguageModelV2StreamPart[],
					initialDelayInMs: null,
					chunkDelayInMs: null,
				}),
			}
		},
	})
}

// ── createMockArtifactModel ─────────────────────────────────

/**
 * Create a mock model pre-configured for artifact creation tool calls,
 * matching the real `createArtifact` tool shape.
 *
 * Uses `MockLanguageModelV2` from `ai/test` under the hood.
 *
 * @example
 * ```ts
 * const model = createMockArtifactModel({
 *   title: "My Code",
 *   kind: "code",
 *   followUpText: "Here's your artifact!",
 * })
 * ```
 */
export function createMockArtifactModel(overrides?: {
	title?: string
	kind?: string
	followUpText?: string
}): LanguageModelV2 {
	return createMockToolCallModel({
		toolName: "createArtifact",
		args: {
			title: overrides?.title ?? "Test Artifact",
			kind: overrides?.kind ?? "text",
		},
		followUpText: overrides?.followUpText ?? "I've created the artifact for you.",
	})
}

// ── Internal helper ─────────────────────────────────────────

/** Split text into stream delta chunks of ~10 chars for realistic streaming. */
function splitTextToDeltas(text: string, id: string): LanguageModelV2StreamPart[] {
	const chunkSize = 10
	const deltas: LanguageModelV2StreamPart[] = []
	for (let i = 0; i < text.length; i += chunkSize) {
		deltas.push({
			type: "text-delta",
			id,
			delta: text.slice(i, i + chunkSize),
		})
	}
	return deltas
}
