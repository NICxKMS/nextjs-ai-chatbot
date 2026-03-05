// ── Settings types (feature-level) ───────────────────────────
// Re-exports the canonical SettingsState from lib/types/settings.types.
// P0-T07 owns the definition — this file NEVER redefines it.
// Model selection is handled separately (cookie/model selector), not here.

export type { SettingsState } from "@/lib/types/settings.types"

import type { SettingsState } from "@/lib/types/settings.types"

/**
 * Default settings for chat parameters.
 * Does NOT include model selection — that's handled by the model selector.
 */
export const DEFAULT_SETTINGS = {
	temperature: 0.7,
	topP: 1,
	maxOutputTokens: 4096,
	systemPrompt: "",
	enableReasoning: false,
} as const satisfies SettingsState
