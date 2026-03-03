import type {
	ArtifactHandler,
	CreateArtifactParams,
	UpdateArtifactParams,
} from "@/lib/types/artifact-handler.types"

// ── Image Artifact Handler ───────────────────────────────────
// Minimal handler for kind "image".
//
// Image artifacts are NOT created via AI generation — they are
// produced by code execution (e.g., Pyodide matplotlib output).
// This handler exists for type completeness and version
// persistence so the registry has an entry for every ArtifactKind.

export const imageHandler: ArtifactHandler = {
	async create(_params: CreateArtifactParams): Promise<string> {
		// Image creation is handled externally by code execution
		// (Pyodide), not by AI generation. Return empty content —
		// the actual base64 data URL is written to the artifact
		// store directly by the code editor's execution pipeline.
		return ""
	},

	async update(params: UpdateArtifactParams): Promise<string> {
		// No-op: image updates are not AI-driven.
		// Return existing content unchanged for version persistence.
		return params.currentContent
	},
}
