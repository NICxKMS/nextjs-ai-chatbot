import type { ModelMetadata } from "@/lib/types/model.types"

// ── Tool identifiers ─────────────────────────────────────────
// Canonical list of AI tools available to models that support tool calling.
// Uses "artifact" naming — NEVER "document".

export const TOOL_IDS = [
	"getWeather",
	"createArtifact",
	"updateArtifact",
	"requestSuggestions",
] as const

export type ToolId = (typeof TOOL_IDS)[number]

// ── Tool enablement ──────────────────────────────────────────

/**
 * Determine which tools are available for a given model.
 *
 * Gating is metadata-driven via `model.supportsToolCalling` — no
 * hardcoded model-ID prefix matching.
 *
 * @returns Array of enabled tool IDs, empty if the model cannot use tools.
 */
export function getEnabledTools(model: ModelMetadata): readonly ToolId[] {
	if (!model.supportsToolCalling) {
		return []
	}

	return TOOL_IDS
}
