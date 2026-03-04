import type { UIMessage } from "ai"

import type { Message } from "@/lib/types/models.types"

/**
 * Convert DB messages to the AI SDK `UIMessage[]` format.
 *
 * Maps `role` and `parts` with type assertions — safe because the DB schema
 * stores these fields in the same shape that `UIMessage` expects.
 */
export function convertToUIMessages(dbMessages: Message[]): UIMessage[] {
	return dbMessages.map((msg) => ({
		id: msg.id,
		role: msg.role as UIMessage["role"],
		parts: msg.parts as UIMessage["parts"],
	}))
}

/** Extract concatenated text from a UIMessage's text parts */
export function getMessageText(message: UIMessage): string {
	return (message.parts ?? [])
		.filter((part): part is { type: "text"; text: string } => part.type === "text")
		.map((part) => part.text)
		.join("\n")
		.trim()
}
