import { AppError } from "@/lib/errors/app-error"
import type { ArtifactKind } from "@/lib/types/artifact.types"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"

type ArtifactOperation = "create" | "update"
type ArtifactDeltaType =
	| "artifact-codeDelta"
	| "artifact-imageDelta"
	| "artifact-sheetDelta"
	| "artifact-textDelta"

const ARTIFACT_DELTA_TYPES = new Set<ArtifactDeltaType>([
	"artifact-codeDelta",
	"artifact-imageDelta",
	"artifact-sheetDelta",
	"artifact-textDelta",
])

function hasUsableArtifactDeltaContent(content: string): boolean {
	return content.trim().length > 0
}

export function ensureArtifactContent(content: string, operation: ArtifactOperation): string {
	if (content.trim().length === 0) {
		throw AppError.aiError(
			"ai_error:artifact:empty_output",
			`Artifact ${operation} produced no content`,
		)
	}

	return content
}

export function writeArtifactClear(chatStream: ArtifactStreamWriter): void {
	chatStream.writeData({ type: "artifact-clear", content: "" })
}

export function createDeferredArtifactClearWriter(
	chatStream: ArtifactStreamWriter,
): ArtifactStreamWriter {
	let didClear = false
	let bufferedLeadingText = ""

	return {
		writeData(data) {
			if (!ARTIFACT_DELTA_TYPES.has(data.type as ArtifactDeltaType) || didClear) {
				chatStream.writeData(data)
				return
			}

			if (typeof data.content !== "string") {
				writeArtifactClear(chatStream)
				didClear = true
				chatStream.writeData(data)
				return
			}

			if (!hasUsableArtifactDeltaContent(data.content)) {
				if (data.type === "artifact-textDelta") {
					bufferedLeadingText += data.content
				}

				return
			}

			writeArtifactClear(chatStream)
			didClear = true

			if (data.type === "artifact-textDelta" && bufferedLeadingText.length > 0) {
				chatStream.writeData({
					type: data.type,
					content: `${bufferedLeadingText}${data.content}`,
				})
				return
			}

			chatStream.writeData(data)
		},
	}
}

export function writeArtifactCreatePrelude(
	chatStream: ArtifactStreamWriter,
	data: { id: string; title: string; kind: ArtifactKind },
): void {
	chatStream.writeData({ type: "artifact-kind", content: data.kind })
	chatStream.writeData({ type: "artifact-id", content: data.id })
	chatStream.writeData({ type: "artifact-title", content: data.title })
	writeArtifactClear(chatStream)
}

export function writeArtifactFinish(chatStream: ArtifactStreamWriter): void {
	chatStream.writeData({ type: "artifact-finish", content: "" })
}
