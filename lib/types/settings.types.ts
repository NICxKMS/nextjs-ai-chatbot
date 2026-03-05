// ── Settings state ───────────────────────────────────────────
// Canonical shared definition for chat settings.
// P3-T06 re-exports from features/settings/types/ — never redefines.
// Model selection is handled separately (cookie/localStorage), not here.

export interface SettingsState {
	temperature: number
	topP: number
	maxOutputTokens: number
	systemPrompt: string
	enableReasoning: boolean
	contextDisplayMode: "compact" | "detailed"
}
