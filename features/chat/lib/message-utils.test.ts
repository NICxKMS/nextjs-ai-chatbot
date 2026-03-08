// Flow: chat-message-rendering | Step: message-transformation
import type { UIMessage } from "ai"
import { describe, expect, it } from "vitest"

import { convertToUIMessages, getMessageText } from "@/features/chat/lib/message-utils"

// ── Helpers ──────────────────────────────────────────────────────

/** Helper that produces objects structurally compatible with UIMessageSource.
 *  The `role` param is `string` so error-path tests can inject invalid roles. */
function dbMsg(overrides: Partial<{ id: string; role: string; parts: unknown }> = {}): {
	id: string
	role: "user" | "assistant" | "system"
	parts: unknown
} {
	return {
		id: overrides.id ?? "msg-1",
		role: (overrides.role ?? "user") as "user" | "assistant" | "system",
		parts: overrides.parts ?? [{ type: "text", text: "hello" }],
	}
}

// ── convertToUIMessages ──────────────────────────────────────────

describe("convertToUIMessages", () => {
	it("converts a user message", () => {
		const result = convertToUIMessages([dbMsg()])
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({
			id: "msg-1",
			role: "user",
			parts: [{ type: "text", text: "hello" }],
		})
	})

	it("converts an assistant message", () => {
		const result = convertToUIMessages([
			dbMsg({ id: "a1", role: "assistant", parts: [{ type: "text", text: "hi" }] }),
		])
		expect(result[0]).toEqual({
			id: "a1",
			role: "assistant",
			parts: [{ type: "text", text: "hi" }],
		})
	})

	it("converts a system message", () => {
		const result = convertToUIMessages([
			dbMsg({ id: "s1", role: "system", parts: [{ type: "text", text: "system prompt" }] }),
		])
		expect(result[0]?.role).toBe("system")
	})

	it("preserves order of multiple messages", () => {
		const msgs = [
			dbMsg({ id: "1", role: "user", parts: [{ type: "text", text: "q" }] }),
			dbMsg({ id: "2", role: "assistant", parts: [{ type: "text", text: "a" }] }),
			dbMsg({ id: "3", role: "user", parts: [{ type: "text", text: "q2" }] }),
		]
		const result = convertToUIMessages(msgs)
		expect(result.map((m) => m.id)).toEqual(["1", "2", "3"])
	})

	it("returns empty array for empty input", () => {
		expect(convertToUIMessages([])).toEqual([])
	})

	it("handles messages with tool-result parts", () => {
		const result = convertToUIMessages([
			dbMsg({
				id: "t1",
				role: "assistant",
				parts: [
					{ type: "tool-invocation", toolInvocationId: "inv-1", toolName: "weather" },
				],
			}),
		])
		expect(result[0]?.parts).toHaveLength(1)
	})

	// ── Error cases ──

	it("throws on invalid role", () => {
		expect(() => convertToUIMessages([dbMsg({ role: "admin" })])).toThrow(
			/Invalid message role "admin"/,
		)
	})

	it("throws on empty string role", () => {
		expect(() => convertToUIMessages([dbMsg({ role: "" })])).toThrow(/Invalid message role/i)
	})

	it("throws when parts is not an array", () => {
		expect(() => convertToUIMessages([dbMsg({ parts: "not-array" as unknown as [] })])).toThrow(
			/Invalid message parts/,
		)
	})

	it("throws when parts contain a non-object element", () => {
		expect(() => convertToUIMessages([dbMsg({ parts: ["string-part"] })])).toThrow(
			/Invalid message parts/,
		)
	})

	it("throws when parts contain an object without type", () => {
		expect(() => convertToUIMessages([dbMsg({ parts: [{ text: "no type" }] })])).toThrow(
			/Invalid message parts/,
		)
	})

	it("throws when parts contain an object with non-string type", () => {
		expect(() =>
			convertToUIMessages([dbMsg({ parts: [{ type: 123, text: "oops" }] })]),
		).toThrow(/Invalid message parts/)
	})

	it("includes message id in error for role validation", () => {
		expect(() => convertToUIMessages([dbMsg({ id: "xyz", role: "bot" })])).toThrow(/xyz/)
	})

	it("includes message id in error for parts validation", () => {
		expect(() =>
			convertToUIMessages([
				{ id: "abc-123", role: "user", parts: null } as unknown as {
					id: string
					role: "user"
					parts: unknown
				},
			]),
		).toThrow(/abc-123/)
	})
})

// ── getMessageText ───────────────────────────────────────────────

describe("getMessageText", () => {
	it("extracts text from a single text part", () => {
		const msg: UIMessage = {
			id: "1",
			role: "user",
			parts: [{ type: "text", text: "hello world" }],
		}
		expect(getMessageText(msg)).toBe("hello world")
	})

	it("concatenates multiple text parts with newlines", () => {
		const msg: UIMessage = {
			id: "1",
			role: "user",
			parts: [
				{ type: "text", text: "line 1" },
				{ type: "text", text: "line 2" },
			],
		}
		expect(getMessageText(msg)).toBe("line 1\nline 2")
	})

	it("ignores non-text parts", () => {
		const msg: UIMessage = {
			id: "1",
			role: "assistant",
			parts: [
				{ type: "text", text: "hello" },
				{
					type: "dynamic-tool",
					toolCallId: "inv-1",
					toolName: "weather",
					state: "input-available",
					input: {},
				},
				{ type: "text", text: "world" },
			],
		}
		expect(getMessageText(msg)).toBe("hello\nworld")
	})

	it("returns empty string when there are no text parts", () => {
		const msg: UIMessage = {
			id: "1",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolCallId: "inv-1",
					toolName: "test",
					state: "input-available",
					input: {},
				},
			],
		}
		expect(getMessageText(msg)).toBe("")
	})

	it("returns empty string when parts is empty", () => {
		const msg: UIMessage = { id: "1", role: "user", parts: [] }
		expect(getMessageText(msg)).toBe("")
	})

	it("trims leading and trailing whitespace from result", () => {
		const msg: UIMessage = {
			id: "1",
			role: "user",
			parts: [{ type: "text", text: "  padded  " }],
		}
		expect(getMessageText(msg)).toBe("padded")
	})

	it("handles parts with empty text", () => {
		const msg: UIMessage = {
			id: "1",
			role: "user",
			parts: [{ type: "text", text: "" }],
		}
		expect(getMessageText(msg)).toBe("")
	})
})
