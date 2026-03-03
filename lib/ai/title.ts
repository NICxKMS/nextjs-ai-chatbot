import { generateText } from "ai"
import { myProvider } from "@/lib/ai/provider"
import { TITLE_MODEL } from "@/lib/types/model.types"

/** Maximum time (ms) to wait for AI title generation before falling back. */
const TITLE_TIMEOUT_MS = 5_000

/** Maximum character length for generated titles. */
const MAX_TITLE_LENGTH = 80

/**
 * Generate a short chat title from the user's first message.
 *
 * Uses a lightweight model (`TITLE_MODEL`) to keep latency and cost low.
 * Wrapped with `AbortSignal.timeout()` to prevent indefinite hangs that
 * would block stream close and message persistence.
 *
 * Called server-side — the title is awaited before the stream finishes.
 *
 * @param message - The raw text of the user's first message.
 * @returns A concise title (≤80 chars), or a trimmed fallback on failure.
 */
export async function generateTitle(message: string): Promise<string> {
	try {
		const { text: title } = await generateText({
			model: myProvider.languageModel(TITLE_MODEL),
			system: `\
- you will generate a short title based on the first message a user begins a conversation with
- ensure it is not more than 80 characters long
- the title should be a summary of the user's message
- do not use quotes or colons`,
			prompt: message,
			abortSignal: AbortSignal.timeout(TITLE_TIMEOUT_MS),
		})

		return title.slice(0, MAX_TITLE_LENGTH).trim() || fallbackTitle(message)
	} catch {
		// Timeout, network error, or model failure — fall back to message excerpt
		return fallbackTitle(message)
	}
}

/**
 * Extract a title from the raw message text as a last-resort fallback.
 */
function fallbackTitle(message: string): string {
	const trimmed = message.trim().slice(0, MAX_TITLE_LENGTH).trim()
	return trimmed || "New Chat"
}
