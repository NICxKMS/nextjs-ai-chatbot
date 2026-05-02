export type ReasoningTag = {
	tagName: string
}

const REASONING_TAGS: Array<{ prefix: string; tag: ReasoningTag }> = [
	{ prefix: "google:gemini-3", tag: { tagName: "thinking" } },
	{ prefix: "google:gemini-2.5", tag: { tagName: "thinking" } },
	{ prefix: "openai:o", tag: { tagName: "thinking" } },
	{ prefix: "openrouter:deepseek/deepseek-r1", tag: { tagName: "think" } },
]

export function getReasoningTag(modelId: string): ReasoningTag | null {
	for (const { prefix, tag } of REASONING_TAGS) {
		if (modelId.startsWith(prefix)) {
			return tag
		}
	}

	return null
}
