/**
 * Auth Feature Barrel Export
 *
 * Main barrel export for the authentication feature module.
 *
 * @module features/auth
 */

// =============================================================================
// Components
// =============================================================================

export { AuthForm, AuthProvider, ProtectedRoute } from "./components"

// =============================================================================
// Hooks
// =============================================================================

export { type UseAuthStateReturn, useAuth, useAuthState } from "./hooks"

// =============================================================================
// Server Actions
// =============================================================================

export {
	login,
	loginWithRedirect,
	logout,
	logoutWithRedirect,
	register,
	registerWithRedirect,
} from "./actions"

// =============================================================================
// Schemas
// =============================================================================

export {
	type LoginInput,
	loginSchema,
	type RegisterInput,
	type ResetPasswordInput,
	registerSchema,
	resetPasswordSchema,
	type UpdatePasswordInput,
	updatePasswordSchema,
} from "./schemas"

// =============================================================================
// Types
// =============================================================================

export type {
	AppSession,
	AppSessionUser,
	AuthContextValue,
	AuthFormProps,
	AuthProviderProps,
	AuthResult,
	AuthStatus,
	AuthUser,
	LoginCredentials,
	ProtectedRouteProps,
	RegisterCredentials,
} from "./types"
