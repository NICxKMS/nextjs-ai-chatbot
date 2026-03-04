import { simulateReadableStream } from "ai"

import type { ArtifactDataPart, DataPart } from "@/features/chat/types/chat.types"
import type { ArtifactKind } from "@/lib/types/artifact.types"

// ── SSE parsing ──────────────────────────────────────────────

/**
 * Parse a single SSE data line into a typed DataPart.
 * Expects the value after "data: " prefix — a JSON-encoded object.
 * Returns null for non-parseable lines (e.g. comments, empty).
 */
function parseSseDataLine(line: string): DataPart | null {
	const trimmed = line.trim()
	if (!trimmed || trimmed.startsWith(":")) return null

	const dataPrefix = "data: "
	if (!trimmed.startsWith(dataPrefix)) return null

	const jsonStr = trimmed.slice(dataPrefix.length)
	if (jsonStr === "[DONE]") return null

	try {
		return JSON.parse(jsonStr) as DataPart
	} catch {
		return null
	}
}

// ── Stream event types ───────────────────────────────────────

/** A collected stream event with its parsed type and raw data. */
export interface StreamEvent<T = DataPart> {
	/** The parsed event data */
	data: T
	/** Original raw text line (before parsing) */
	raw: string
}

// ── collectStreamEvents ──────────────────────────────────────

/**
 * Consume a ReadableStream (e.g. from a fetch Response.body) and
 * collect all SSE events into an array for assertion.
 *
 * Works with the SSE format produced by `JsonToSseTransformStream`
 * from the Vercel AI SDK, which is used by `/api/chat`.
 *
 * @example
 * ```ts
 * const response = await POST(request)
 * const events = await collectStreamEvents(response.body!)
 *
 * const artifactId = events.find(e => e.data.type === "artifact-id")
 * expect(artifactId?.data.content).toBe("abc-123")
 * ```
 */
export async function collectStreamEvents(
	stream: ReadableStream<Uint8Array>,
): Promise<StreamEvent[]> {
	const reader = stream.getReader()
	const decoder = new TextDecoder()
	const events: StreamEvent[] = []
	let buffer = ""

	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })
			const lines = buffer.split("\n")

			// Keep the last (potentially incomplete) line in the buffer
			buffer = lines.pop() ?? ""

			for (const line of lines) {
				const parsed = parseSseDataLine(line)
				if (parsed) {
					events.push({ data: parsed, raw: line })
				}
			}
		}

		// Process any remaining buffer content
		if (buffer.trim()) {
			const parsed = parseSseDataLine(buffer)
			if (parsed) {
				events.push({ data: parsed, raw: buffer })
			}
		}
	} finally {
		reader.releaseLock()
	}

	return events
}

// ── collectRawStreamChunks ───────────────────────────────────

/**
 * Consume a ReadableStream and return all chunks as decoded strings.
 * Low-level utility for tests that need raw text inspection.
 */
export async function collectRawStreamChunks(
	stream: ReadableStream<Uint8Array>,
): Promise<string[]> {
	const reader = stream.getReader()
	const decoder = new TextDecoder()
	const chunks: string[] = []

	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			chunks.push(decoder.decode(value, { stream: true }))
		}
	} finally {
		reader.releaseLock()
	}

	return chunks
}

// ── Artifact-specific helpers ────────────────────────────────

/**
 * Filter collected stream events to only artifact-related data parts.
 * Excludes "chat-title" and "error" types.
 */
export function filterArtifactEvents(events: StreamEvent[]): StreamEvent<ArtifactDataPart>[] {
	return events.filter((e): e is StreamEvent<ArtifactDataPart> =>
		e.data.type.startsWith("artifact-"),
	)
}

/**
 * Build a simulated SSE stream from an array of DataParts.
 * Useful for creating test fixtures that match the real `/api/chat` output format.
 *
 * @example
 * ```ts
 * const stream = buildSseStream([
 *   { type: "artifact-id", content: "abc-123" },
 *   { type: "artifact-title", content: "My Artifact" },
 *   { type: "artifact-kind", content: "text" },
 *   { type: "artifact-textDelta", content: "Hello world" },
 *   { type: "artifact-finish", content: "" },
 * ])
 * const events = await collectStreamEvents(stream)
 * expect(events).toHaveLength(5)
 * ```
 */
export function buildSseStream(parts: DataPart[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder()
	const chunks = parts.map((part) => encoder.encode(`data: ${JSON.stringify(part)}\n\n`))

	return simulateReadableStream({
		chunks,
		initialDelayInMs: null,
		chunkDelayInMs: null,
	})
}

/**
 * Build a complete artifact creation event sequence for testing.
 * Returns DataPart array representing a full artifact lifecycle (create → stream → finish).
 */
export function buildArtifactCreateSequence(overrides?: {
	id?: string
	title?: string
	kind?: ArtifactKind
	content?: string
}): DataPart[] {
	const id = overrides?.id ?? "test-artifact-id"
	const title = overrides?.title ?? "Test Artifact"
	const kind: ArtifactKind = overrides?.kind ?? "text"
	const content = overrides?.content ?? "Hello, world!"

	const deltaType =
		kind === "code"
			? "artifact-codeDelta"
			: kind === "sheet"
				? "artifact-sheetDelta"
				: kind === "image"
					? "artifact-imageDelta"
					: "artifact-textDelta"

	return [
		{ type: "artifact-id", content: id },
		{ type: "artifact-title", content: title },
		{ type: "artifact-kind", content: kind },
		{ type: "artifact-clear", content: "" },
		{ type: deltaType, content } as DataPart,
		{ type: "artifact-finish", content: "" },
	]
}
