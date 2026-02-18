/**
 * Title Generation Module
 *
 * Provides AI-powered chat title generation from user messages.
 * Falls back to text extraction when AI generation fails.
 *
 * @module lib/ai/title-generation
 */

import { generateText, type UIMessage } from "ai"
import { isTestEnvironment } from "@/lib/constants"
import { logWarn } from "@/lib/log"
import { TITLE_GENERATION_MAX_TOKENS } from "./constants"
import { getDefaultChatModel, getModel } from "./registry"

/**
 * System prompt for title generation.
 * Instructs the AI to create concise, meaningful titles.
 */
const TITLE_SYSTEM_PROMPT = `
- you will generate a short title based on the first message a user begins a conversation with
- ensure it is not more than 80 characters long
- the title should be a summary of the user's message
- do not use quotes or colons`

/**
 * Get the model to use for title generation.
 * In test environment, uses a small fast model.
 * Otherwise uses the default chat model.
 */
function getTitleModel() {
	const defaultModel = getDefaultChatModel()
	const modelId = isTestEnvironment
		? "openai:gpt-4o-mini"
		: (defaultModel?.id ?? "openai:gpt-4o-mini")
	return getModel(modelId)
}

/**
 * Generate a chat title from the user's first message.
 * Uses AI to create a concise, meaningful title.
 * Falls back to text extraction if AI generation fails.
 *
 * @param message - The first user message
 * @returns A short title (max 80 characters)
 *
 * @example
 * ```typescript
 * const title = await generateTitleFromUserMessage({
 *   message: userMessage
 * });
 * // Returns: "Help with React hooks"
 * ```
 */
export async function generateTitleFromUserMessage({
	message,
}: {
	message: UIMessage
}): Promise<string> {
	try {
		const model = getTitleModel()

		const { text: title } = await generateText({
			model,
			system: TITLE_SYSTEM_PROMPT,
			prompt: JSON.stringify(message),
			maxOutputTokens: TITLE_GENERATION_MAX_TOKENS,
		})

		return title || "New Chat"
	} catch (error) {
		// Log the error for observability, then fallback to extracting first part of message text
		logWarn("Title generation failed, using fallback", {
			error,
			messageId: message.id,
		})

		return generatePlaceholderTitle(message)
	}
}

/**
 * Generate a placeholder title from message content synchronously.
 * Used as immediate title while async generation happens.
 * Extracts the first 80 characters from the message text.
 *
 * @param message - The user message
 * @returns A placeholder title (max 80 characters)
 *
 * @example
 * ```typescript
 * const placeholder = generatePlaceholderTitle(userMessage);
 * // Returns: "Can you help me understand how to use React hooks..."
 * ```
 */
export function generatePlaceholderTitle(message: UIMessage): string {
	try {
		const parts = message.parts as
			| Array<{ type: string; text?: string }>
			| undefined
		const textPart = parts?.find(
			(p): p is { type: "text"; text: string } =>
				p?.type === "text" && typeof p.text === "string",
		)
		const base = (textPart?.text || "").trim()
		const trimmed =
			base.length > 0
				? base.slice(0, TITLE_GENERATION_MAX_TOKENS)
				: "New Chat"
		return trimmed
	} catch {
		return "New Chat"
	}
}
