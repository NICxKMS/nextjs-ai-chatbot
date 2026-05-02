import type { UIMessage } from "ai"

import type { Message } from "@/lib/types/entity.types"

type UIMessageSource = Pick<Message, "id" | "role" | "parts">

// ── Runtime validation for DB → UIMessage conversion ─────────────────────────

const VALID_ROLES = new Set<UIMessage["role"]>(["user", "assistant", "system"])

function isValidRole(role: unknown): role is UIMessage["role"] {
	return typeof role === "string" && VALID_ROLES.has(role as UIMessage["role"])
}

function isValidParts(parts: unknown): parts is UIMessage["parts"] {
	if (!Array.isArray(parts)) return false
	// Each part must be an object with a `type` string — the SDK handles the rest
	return parts.every(
		(part) =>
			typeof part === "object" &&
			part !== null &&
			"type" in part &&
			typeof part.type === "string",
	)
}

/**
 * Validate and convert a single DB row to a `UIMessage`.
 *
 * The `role` and `parts` columns come from the database as typed enum/jsonb,
 * but Drizzle infers them broadly. This function validates at runtime before
 * casting to prevent corrupt data from propagating silently.
 *
 * @throws {Error} If role or parts are invalid — indicates data corruption.
 */
function toValidatedUIMessage(msg: UIMessageSource): UIMessage {
	if (!isValidRole(msg.role)) {
		throw new Error(`Invalid message role "${String(msg.role)}" for message ${msg.id}`)
	}

	if (!isValidParts(msg.parts)) {
		throw new Error(
			`Invalid message parts for message ${msg.id}: expected array of typed objects`,
		)
	}

	return {
		id: msg.id,
		role: msg.role,
		parts: msg.parts,
	}
}

/**
 * Convert persisted chat messages to the AI SDK `UIMessage[]` format.
 *
 * Validates `role` and `parts` at runtime — safe because each row is checked
 * before casting to the `UIMessage` shape the SDK expects.
 */
export function convertToUIMessages(dbMessages: UIMessageSource[]): UIMessage[] {
	return dbMessages.map(toValidatedUIMessage)
}

/** Extract concatenated text from a UIMessage's text parts */
export function getMessageText(message: UIMessage): string {
	return (message.parts ?? [])
		.filter((part): part is { type: "text"; text: string } => part.type === "text")
		.map((part) => part.text)
		.join("\n")
		.trim()
}

/**
 * Extract copyable text from a UIMessage, including both reasoning and text parts.
 *
 * If reasoning is present, output is labeled:
 * ```
 * [Reasoning]
 * …reasoning…
 *
 * [Response]
 * …response…
 * ```
 * If no reasoning exists, returns plain text (no labels).
 */
export function getCopyableMessageText(message: UIMessage): string {
	const parts = message.parts ?? []

	const reasoningText = parts
		.filter(
			(part): part is { type: "reasoning"; text: string } =>
				part.type === "reasoning" &&
				"text" in part &&
				typeof (part as Record<string, unknown>).text === "string",
		)
		.map((part) => part.text)
		.join("\n")
		.trim()

	const responseText = parts
		.filter((part): part is { type: "text"; text: string } => part.type === "text")
		.map((part) => part.text)
		.join("\n")
		.trim()

	if (reasoningText) {
		const sections = ["[Reasoning]", reasoningText]
		if (responseText) {
			sections.push("", "[Response]", responseText)
		}
		return sections.join("\n")
	}

	return responseText
}
