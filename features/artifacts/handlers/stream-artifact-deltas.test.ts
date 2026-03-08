// Flow: artifact-streaming | Step: delta-collection
import { describe, expect, it, vi } from "vitest"

import { collectReplacingObjectStream, collectTextStreamDeltas } from "./stream-artifact-deltas"

// ── Helpers ────────────────────────────────────────────────────

/** Create an async iterable from an array of items. */
async function* toAsyncIterable<T>(items: T[]): AsyncIterable<T> {
	for (const item of items) {
		yield item
	}
}

function createMockWriter() {
	return { writeData: vi.fn() }
}

// ── collectTextStreamDeltas ────────────────────────────────────

describe("collectTextStreamDeltas", () => {
	it("collects text-delta parts into a single string", async () => {
		const stream = toAsyncIterable([
			{ type: "text-delta", text: "Hello" },
			{ type: "text-delta", text: " world" },
		])
		const writer = createMockWriter()

		const result = await collectTextStreamDeltas({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-textDelta",
		})

		expect(result).toBe("Hello world")
	})

	it("writes each delta to the chat stream", async () => {
		const stream = toAsyncIterable([
			{ type: "text-delta", text: "A" },
			{ type: "text-delta", text: "B" },
		])
		const writer = createMockWriter()

		await collectTextStreamDeltas({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-textDelta",
		})

		expect(writer.writeData).toHaveBeenCalledTimes(2)
		expect(writer.writeData).toHaveBeenCalledWith({
			type: "artifact-textDelta",
			content: "A",
		})
		expect(writer.writeData).toHaveBeenCalledWith({
			type: "artifact-textDelta",
			content: "B",
		})
	})

	it("skips non-text-delta parts", async () => {
		const stream = toAsyncIterable([
			{ type: "step-start" },
			{ type: "text-delta", text: "only" },
			{ type: "finish" },
		])
		const writer = createMockWriter()

		const result = await collectTextStreamDeltas({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-textDelta",
		})

		expect(result).toBe("only")
		expect(writer.writeData).toHaveBeenCalledTimes(1)
	})

	it("skips text-delta parts with empty text", async () => {
		const stream = toAsyncIterable([
			{ type: "text-delta", text: "" },
			{ type: "text-delta", text: "content" },
		])
		const writer = createMockWriter()

		const result = await collectTextStreamDeltas({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-textDelta",
		})

		expect(result).toBe("content")
		expect(writer.writeData).toHaveBeenCalledTimes(1)
	})

	it("returns empty string for an empty stream", async () => {
		const stream = toAsyncIterable<{ type: string; text?: string }>([])
		const writer = createMockWriter()

		const result = await collectTextStreamDeltas({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-textDelta",
		})

		expect(result).toBe("")
		expect(writer.writeData).not.toHaveBeenCalled()
	})

	it("uses the provided event type", async () => {
		const stream = toAsyncIterable([{ type: "text-delta", text: "x" }])
		const writer = createMockWriter()

		await collectTextStreamDeltas({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-codeDelta",
		})

		expect(writer.writeData).toHaveBeenCalledWith({
			type: "artifact-codeDelta",
			content: "x",
		})
	})
})

// ── collectReplacingObjectStream ───────────────────────────────

describe("collectReplacingObjectStream", () => {
	it("collects object parts using pickContent", async () => {
		const stream = toAsyncIterable([
			{ type: "object", object: { code: "line1\n" } },
			{ type: "object", object: { code: "line1\nline2\n" } },
		])
		const writer = createMockWriter()

		const result = await collectReplacingObjectStream({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-codeDelta",
			pickContent: (obj) => obj?.code,
		})

		// REPLACE semantics: final content is the last emitted value
		expect(result).toBe("line1\nline2\n")
	})

	it("writes each object delta to the chat stream", async () => {
		const stream = toAsyncIterable([
			{ type: "object", object: { csv: "a,b" } },
			{ type: "object", object: { csv: "a,b\n1,2" } },
		])
		const writer = createMockWriter()

		await collectReplacingObjectStream({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-sheetDelta",
			pickContent: (obj) => obj?.csv,
		})

		expect(writer.writeData).toHaveBeenCalledTimes(2)
		expect(writer.writeData).toHaveBeenCalledWith({
			type: "artifact-sheetDelta",
			content: "a,b",
		})
		expect(writer.writeData).toHaveBeenCalledWith({
			type: "artifact-sheetDelta",
			content: "a,b\n1,2",
		})
	})

	it("skips non-object parts", async () => {
		const stream = toAsyncIterable([
			{ type: "step-start" },
			{ type: "object", object: { code: "result" } },
			{ type: "finish" },
		])
		const writer = createMockWriter()

		const result = await collectReplacingObjectStream({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-codeDelta",
			pickContent: (obj) => obj?.code,
		})

		expect(result).toBe("result")
		expect(writer.writeData).toHaveBeenCalledTimes(1)
	})

	it("skips objects where pickContent returns undefined", async () => {
		const stream = toAsyncIterable([
			{ type: "object", object: undefined },
			{ type: "object", object: { code: "valid" } },
		])
		const writer = createMockWriter()

		const result = await collectReplacingObjectStream({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-codeDelta",
			pickContent: (obj) => obj?.code,
		})

		expect(result).toBe("valid")
		expect(writer.writeData).toHaveBeenCalledTimes(1)
	})

	it("returns empty string for an empty stream", async () => {
		const stream = toAsyncIterable<{ type: string; object?: { code: string } }>([])
		const writer = createMockWriter()

		const result = await collectReplacingObjectStream({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-codeDelta",
			pickContent: (obj) => obj?.code,
		})

		expect(result).toBe("")
		expect(writer.writeData).not.toHaveBeenCalled()
	})

	it("overwrites content with each new object (replace semantics)", async () => {
		const stream = toAsyncIterable([
			{ type: "object", object: { code: "first" } },
			{ type: "object", object: { code: "second" } },
			{ type: "object", object: { code: "third" } },
		])
		const writer = createMockWriter()

		const result = await collectReplacingObjectStream({
			fullStream: stream,
			chatStream: writer,
			eventType: "artifact-codeDelta",
			pickContent: (obj) => obj?.code,
		})

		expect(result).toBe("third")
		expect(writer.writeData).toHaveBeenCalledTimes(3)
	})
})
