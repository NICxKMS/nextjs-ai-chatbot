// ── Auth types — shared across auth forms, actions, and session resolution ──

// Re-export canonical types from their single source of truth (P2-T01).
export type { AppSession, UserType } from "@/lib/auth/session"

/**
 * Auth form mode — determines which schema and action to use.
 * Used by `AuthForm` component to switch between login/register views.
 */
export type AuthMode = "login" | "register"
