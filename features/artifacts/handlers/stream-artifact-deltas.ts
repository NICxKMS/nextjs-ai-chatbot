import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"

type TextStreamPart = {
	type: string
	text?: string
}

type ObjectStreamPart<T> = {
	type: string
	object?: T
}

type StreamDeltaType = "artifact-codeDelta" | "artifact-sheetDelta" | "artifact-textDelta"

export async function collectTextStreamDeltas({
	fullStream,
	chatStream,
	eventType,
}: {
	fullStream: AsyncIterable<TextStreamPart>
	chatStream: ArtifactStreamWriter
	eventType: StreamDeltaType
}): Promise<string> {
	let content = ""

	for await (const part of fullStream) {
		if (part.type !== "text-delta" || !part.text) {
			continue
		}

		content += part.text
		chatStream.writeData({ type: eventType, content: part.text })
	}

	return content
}

export async function collectReplacingObjectStream<T>({
	fullStream,
	chatStream,
	eventType,
	pickContent,
}: {
	fullStream: AsyncIterable<ObjectStreamPart<T>>
	chatStream: ArtifactStreamWriter
	eventType: StreamDeltaType
	pickContent: (object: T | undefined) => string | undefined
}): Promise<string> {
	let content = ""

	for await (const part of fullStream) {
		if (part.type !== "object") {
			continue
		}

		const nextContent = pickContent(part.object)
		if (!nextContent) {
			continue
		}

		chatStream.writeData({ type: eventType, content: nextContent })
		content = nextContent
	}

	return content
}
