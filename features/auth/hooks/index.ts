/**
 * Auth Hooks Barrel Export
 *
 * Re-exports all authentication hooks.
 *
 * @module features/auth/hooks
 */

// Re-export from AuthProvider for convenience
export { useAuth } from "../components/auth-provider"
export { type UseAuthStateReturn, useAuthState } from "./use-auth"
export { useLogoutHandler } from "./use-logout-handler"
