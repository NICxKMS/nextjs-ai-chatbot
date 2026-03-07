import type { DataPart } from "@/features/chat/types/chat.types"
import type { UIArtifact } from "@/lib/types/artifact.types"

// ── Default artifact state ───────────────────────────────────
// Used when processStreamDelta needs a baseline. Consumers should
// pass their actual current state; this is only for reference.

export const DEFAULT_ARTIFACT: UIArtifact = {
	artifactId: "",
	title: "",
	kind: "text",
	content: "",
	isVisible: false,
	status: "idle",
	suggestions: [],
}

// ── processStreamDelta ───────────────────────────────────────
// Pure function that applies a single stream data part to the
// current UIArtifact state, producing a new state.
//
// Contract:
//   - No React state mutations (returns a new object)
//   - No side effects (no I/O, no DOM, no subscriptions)
//   - Fully testable without any framework
//
// Delta semantics:
//   artifact-id:         SET artifactId, status → streaming, isVisible → true
//   artifact-title:      SET title
//   artifact-kind:       SET kind
//   artifact-clear:      RESET content to "", RESET suggestions to []
//   artifact-finish:     SET status → idle
//   artifact-textDelta:  APPEND to content
//   artifact-codeDelta:  REPLACE content
//   artifact-sheetDelta: REPLACE content
//   artifact-imageDelta: REPLACE content
//   artifact-suggestion: APPEND to suggestions array
//   chat-title:          No artifact change (handled by chat layer)
//   error:               No artifact change (handled by chat layer)

export function processStreamDelta(delta: DataPart, current: UIArtifact): UIArtifact {
	switch (delta.type) {
		case "artifact-id":
			return {
				...current,
				artifactId: delta.content,
				status: "streaming",
				isVisible: true,
			}

		case "artifact-title":
			return {
				...current,
				title: delta.content,
			}

		case "artifact-kind":
			return {
				...current,
				kind: delta.content,
			}

		case "artifact-clear":
			return {
				...current,
				content: "",
				suggestions: [],
			}

		case "artifact-finish":
			return {
				...current,
				status: "idle",
			}

		// APPEND: concatenate delta to existing content
		case "artifact-textDelta":
			return {
				...current,
				content: current.content + delta.content,
			}

		// REPLACE: overwrite content entirely
		case "artifact-codeDelta":
		case "artifact-sheetDelta":
		case "artifact-imageDelta":
			return {
				...current,
				content: delta.content,
			}

		// APPEND: accumulate suggestions
		case "artifact-suggestion":
			return {
				...current,
				suggestions: [...(current.suggestions ?? []), delta.content],
			}

		// Non-artifact data parts: no artifact state change
		case "chat-title":
		case "usage":
		case "error":
			return current

		default: {
			// Exhaustiveness guard — if new DataPart types are added,
			// TypeScript will flag this as an error at compile time.
			const _exhaustive: never = delta
			return current
		}
	}
}
