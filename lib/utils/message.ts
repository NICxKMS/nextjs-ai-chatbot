/**
 * Message utility functions for chat operations.
 * @module lib/utils/message
 */

import type { UIMessage } from "ai"

/**
 * Gets the most recent user message from an array of messages.
 *
 * Filters messages by role "user" and returns the last one in the array.
 *
 * @param messages - Array of UI messages to search
 * @returns The most recent user message, or undefined if none exist
 *
 * @example
 * ```ts
 * const messages = [
 *   { id: '1', role: 'user', content: 'Hello' },
 *   { id: '2', role: 'assistant', content: 'Hi there!' },
 *   { id: '3', role: 'user', content: 'How are you?' }
 * ]
 * getMostRecentUserMessage(messages) // { id: '3', role: 'user', content: 'How are you?' }
 * ```
 */
export function getMostRecentUserMessage(
	messages: UIMessage[],
): UIMessage | undefined {
	const userMessages = messages.filter((message) => message.role === "user")
	return userMessages.at(-1)
}

/**
 * Gets the ID of the trailing (last) message in an array.
 *
 * @param messages - Object containing the messages array
 * @param messages.messages - Array of messages with id property
 * @returns The ID of the last message, or null if the array is empty
 *
 * @example
 * ```ts
 * const messages = [
 *   { id: '1', role: 'user', content: 'Hello' },
 *   { id: '2', role: 'assistant', content: 'Hi there!' }
 * ]
 * getTrailingMessageId({ messages }) // '2'
 *
 * getTrailingMessageId({ messages: [] }) // null
 * ```
 */
export function getTrailingMessageId({
	messages,
}: {
	messages: Array<{ id: string }>
}): string | null {
	const trailingMessage = messages.at(-1)

	if (!trailingMessage) {
		return null
	}

	return trailingMessage.id
}
