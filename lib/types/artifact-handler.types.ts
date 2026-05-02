import type { ArtifactKind } from "./artifact.types"

// ── Stream writer abstraction ────────────────────────────────

export type ArtifactStreamWriter = {
	writeData(data: { type: string; content: unknown }): void
}

// ── Handler method parameters ────────────────────────────────

export interface CreateArtifactParams {
	id: string
	title: string
	kind: ArtifactKind
	chatId: string
	session: { userId: string; isGuest: boolean }
	chatStream: ArtifactStreamWriter
}

export interface UpdateArtifactParams {
	id: string
	title: string
	kind: ArtifactKind
	currentContent: string
	description: string
	session: { userId: string; isGuest: boolean }
	chatStream: ArtifactStreamWriter
}

// ── Handler interface ────────────────────────────────────────
// Contract for kind-specific artifact handlers.
// Used by handler registry (lib/ai/artifact-handlers.ts) and
// implemented in features/artifacts/handlers/.

export type ArtifactHandler = {
	create(params: CreateArtifactParams): Promise<string>
	update(params: UpdateArtifactParams): Promise<string>
}
