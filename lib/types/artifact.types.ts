import type { ArtifactKind } from "./models.types"

export type { ArtifactKind } from "./models.types"

// ── Artifact status ──────────────────────────────────────────
// Per redesign, only two states needed — artifact errors are handled
// at the component level via error boundaries.

export type ArtifactStatus = "idle" | "streaming"

// ── Artifact suggestion ──────────────────────────────────────
// Canonical definition. Shared between artifact handlers (suggestions API)
// and streaming layer (processStreamDelta). Both features/artifacts/ and
// features/chat/ consume this type. Other files re-export from here,
// never redefine.

export type ArtifactSuggestion = {
	originalText: string
	suggestedText: string
	description: string
	occurrenceIndex?: number
	selectionStart?: number
	selectionEnd?: number
}

// ── Client-side artifact representation ──────────────────────

export type BoundingBox = {
	top: number
	left: number
	width: number
	height: number
}

export type UIArtifact = {
	artifactId: string
	title: string
	kind: ArtifactKind
	content: string
	isVisible: boolean
	status: ArtifactStatus
	suggestions?: ArtifactSuggestion[]
	boundingBox?: BoundingBox
}
