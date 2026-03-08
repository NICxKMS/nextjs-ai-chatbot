/**
 * SSE mock helper for intercepting chat streaming responses in E2E tests.
 *
 * Creates Playwright route fulfillment options that simulate the AI SDK v6
 * UI Message Stream protocol (SSE with JSON objects). Use with `page.route()`
 * to intercept the chat API endpoint and return deterministic responses
 * without hitting a real AI provider.
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol#ui-message-stream
 * @see https://ai-sdk.dev/docs/ai-sdk-core/testing#simulate-ui-message-stream-responses
 *
 * @example
 * ```ts
 * await page.route("/api/chat", (route) => {
 *   route.fulfill(createMockSSEResponse(["Hello", " world", "!"]));
 * });
 * ```
 */

// ── Types ──────────────────────────────────────────────────────

interface MockSSEOptions {
	/** Override the message ID. Defaults to "mock-msg-1". */
	messageId?: string
	/** Override the text part ID. Defaults to "text-1". */
	textId?: string
}

interface RouteFulfillOptions {
	status: number
	headers: Record<string, string>
	body: string
}

// ── UI Message Stream SSE encoding ─────────────────────────────

/** Encode a single SSE event. */
function sseEvent(data: string): string {
	return `data: ${data}\n\n`
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Create a Playwright `route.fulfill()` options object that responds with
 * a mocked SSE stream using the AI SDK v6 UI Message Stream protocol.
 *
 * The response follows the official stream format:
 *   1. `start` — message start with messageId
 *   2. `text-start` — beginning of a text block
 *   3. `text-delta` (×N) — incremental text chunks
 *   4. `text-end` — end of the text block
 *   5. `finish` — message complete
 *   6. `[DONE]` — stream termination sentinel
 *
 * @param chunks - Array of text strings to stream as individual text-delta events.
 * @param options - Optional configuration for message/text IDs.
 * @returns Options suitable for `route.fulfill()`.
 */
export function createMockSSEResponse(
	chunks: string[],
	options?: MockSSEOptions,
): RouteFulfillOptions {
	const messageId = options?.messageId ?? "mock-msg-1"
	const textId = options?.textId ?? "text-1"

	const parts: string[] = [
		// 1. Message start
		sseEvent(JSON.stringify({ type: "start", messageId })),

		// 2. Text block start
		sseEvent(JSON.stringify({ type: "text-start", id: textId })),

		// 3. Text deltas
		...chunks.map((chunk) =>
			sseEvent(JSON.stringify({ type: "text-delta", id: textId, delta: chunk })),
		),

		// 4. Text block end
		sseEvent(JSON.stringify({ type: "text-end", id: textId })),

		// 5. Finish message
		sseEvent(JSON.stringify({ type: "finish" })),

		// 6. Stream termination
		sseEvent("[DONE]"),
	]

	return {
		status: 200,
		headers: {
			"content-type": "text/event-stream",
			"x-vercel-ai-ui-message-stream": "v1",
		},
		body: parts.join(""),
	}
}
