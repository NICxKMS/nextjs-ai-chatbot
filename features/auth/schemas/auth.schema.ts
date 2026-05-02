import { z } from "zod"

// ── Auth validation schemas ─────────────────────────────────
// Used for both client-side form validation and server-side action validation.
// Schema names use camelCase + Schema suffix per AGENTS.md conventions.

/**
 * Login form validation.
 * Validates email format and password length (6–100 chars).
 */
export const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z
		.string()
		.min(6, "Password must be at least 6 characters")
		.max(100, "Password must be at most 100 characters"),
})

/**
 * Register form validation.
 * Register currently uses the same credentials-only contract as login.
 */
export const registerSchema = loginSchema

// ── Inferred types ──────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
