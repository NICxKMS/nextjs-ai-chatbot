import { z } from "zod"

// ── Settings validation schema ──────────────────────────────
// Field-level validation for chat settings.
// Used by settingsStore.updateSettings to validate partial updates
// before writing to localStorage.

export const settingsSchema = z.object({
	temperature: z.number().min(0).max(2),
	topP: z.number().min(0).max(1),
	maxOutputTokens: z.number().int().min(256).max(1_000_000),
	systemPrompt: z.string().max(8192),
	enableReasoning: z.boolean(),
	contextDisplayMode: z.enum(["compact", "detailed"]).default("compact"),
})
