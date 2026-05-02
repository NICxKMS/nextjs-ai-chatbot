import { describe, expect, it, vi } from "vitest"

import {
	DEFAULT_SAVE_ERROR_MESSAGE,
	mergeArtifactVersion,
	readSaveErrorMessage,
} from "@/features/artifacts/components/artifact-save-utils"
import {
	createDeferredArtifactClearWriter,
	ensureArtifactContent,
	writeArtifactCreatePrelude,
	writeArtifactFinish,
} from "@/features/chat/lib/tools/artifact-tool-utils"
import { AppError } from "@/lib/errors/app-error"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import type { Artifact } from "@/lib/types/entity.types"

function artifact(overrides: Partial<Artifact> & Pick<Artifact, "id" | "createdAt">): Artifact {
	const { id, createdAt, ...rest } = overrides
	return {
		id,
		createdAt,
		title: "Artifact",
		content: "content",
		kind: "text",
		userId: "user-1",
		chatId: "chat-1",
		updatedAt: createdAt,
		...rest,
	}
}

function createWriter() {
	const events: Array<{ type: string; content: unknown }> = []
	const writer: ArtifactStreamWriter = { writeData: vi.fn((event) => events.push(event)) }
	return { events, writer }
}

describe("artifact tool utilities", () => {
	it("throws a typed AI error when artifact generation returns empty output", () => {
		expect(() => ensureArtifactContent("  \n", "create")).toThrow(AppError)

		try {
			ensureArtifactContent("", "update")
		} catch (error) {
			expect(error).toBeInstanceOf(AppError)
			if (error instanceof AppError) {
				expect(error.code).toBe("ai_error:artifact:empty_output")
				expect(error.message).toBe("Artifact update produced no content")
			}
		}

		expect(ensureArtifactContent(" content ", "create")).toBe(" content ")
	})

	it("buffers leading empty text deltas until the first usable artifact content", () => {
		const { events, writer } = createWriter()
		const deferredWriter = createDeferredArtifactClearWriter(writer)

		deferredWriter.writeData({ type: "artifact-textDelta", content: " \n" })
		deferredWriter.writeData({ type: "artifact-textDelta", content: "Hello" })
		deferredWriter.writeData({ type: "artifact-textDelta", content: " world" })

		expect(events).toEqual([
			{ type: "artifact-clear", content: "" },
			{ type: "artifact-textDelta", content: " \nHello" },
			{ type: "artifact-textDelta", content: " world" },
		])
	})

	it("forwards non-artifact events before deferred clear and clears immediately for non-string deltas", () => {
		const { events, writer } = createWriter()
		const deferredWriter = createDeferredArtifactClearWriter(writer)

		deferredWriter.writeData({ type: "status", content: "working" })
		deferredWriter.writeData({ type: "artifact-codeDelta", content: { chunk: "print(1)" } })

		expect(events).toEqual([
			{ type: "status", content: "working" },
			{ type: "artifact-clear", content: "" },
			{ type: "artifact-codeDelta", content: { chunk: "print(1)" } },
		])
	})

	it("writes artifact create and finish lifecycle events in stream order", () => {
		const { events, writer } = createWriter()

		writeArtifactCreatePrelude(writer, { id: "artifact-1", title: "Draft", kind: "code" })
		writeArtifactFinish(writer)

		expect(events).toEqual([
			{ type: "artifact-kind", content: "code" },
			{ type: "artifact-id", content: "artifact-1" },
			{ type: "artifact-title", content: "Draft" },
			{ type: "artifact-clear", content: "" },
			{ type: "artifact-finish", content: "" },
		])
	})
})

describe("artifact save utilities", () => {
	it("merges a saved version at the front and de-duplicates by timestamp", () => {
		const createdAt = new Date("2026-05-01T00:00:00.000Z")
		const older = artifact({
			id: "artifact-1",
			createdAt: new Date("2026-04-30T00:00:00.000Z"),
		})
		const replaced = artifact({ id: "artifact-1", createdAt, title: "Old title" })
		const next = artifact({ id: "artifact-1", createdAt, title: "New title" })

		expect(mergeArtifactVersion([older, replaced], next)).toEqual([next, older])
		expect(mergeArtifactVersion(undefined, next)).toEqual([next])
	})

	it("extracts save error messages with generic fallback", async () => {
		await expect(
			readSaveErrorMessage(
				Response.json({ errorMessage: "Version conflict" }, { status: 409 }),
			),
		).resolves.toBe("Version conflict")

		await expect(readSaveErrorMessage(new Response("not json", { status: 500 }))).resolves.toBe(
			DEFAULT_SAVE_ERROR_MESSAGE,
		)

		await expect(
			readSaveErrorMessage(Response.json({ message: " " }, { status: 400 })),
		).resolves.toBe(DEFAULT_SAVE_ERROR_MESSAGE)
	})
})
