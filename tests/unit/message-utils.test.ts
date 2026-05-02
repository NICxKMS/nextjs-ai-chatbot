import type { UIMessage } from "ai"
import { describe, expect, it } from "vitest"

import {
	convertToUIMessages,
	getCopyableMessageText,
	getMessageText,
} from "@/features/chat/lib/message-utils"

describe("message utilities", () => {
	it("validates persisted messages before converting to UI messages", () => {
		expect(
			convertToUIMessages([
				{ id: "m1", role: "user", parts: [{ type: "text", text: "Hello" }] },
			]),
		).toEqual([{ id: "m1", role: "user", parts: [{ type: "text", text: "Hello" }] }])

		const corruptRows = [
			{ id: "m2", role: "invalid", parts: [{ type: "text", text: "x" }] },
		] as unknown as Parameters<typeof convertToUIMessages>[0]

		expect(() => convertToUIMessages(corruptRows)).toThrow("Invalid message role")
	})

	it("extracts text and reasoning for user-facing copy actions", () => {
		const message: UIMessage = {
			id: "m1",
			role: "assistant",
			parts: [
				{ type: "reasoning", text: "Think" },
				{ type: "text", text: "Answer" },
			],
		}

		expect(getMessageText(message)).toBe("Answer")
		expect(getCopyableMessageText(message)).toBe("[Reasoning]\nThink\n\n[Response]\nAnswer")
	})
})
