/**
 * Auth Feature - Public API
 * @module features/auth
 */

export { AuthBootstrap } from "./components/auth-bootstrap";
export { AuthForm } from "./components/auth-form";
// Components
export { AuthProvider, useAuth } from "./components/auth-provider";
// P3-008: Re-export services for public API
export {
    createGuestSession,
    type GuestSessionResponse,
} from "./services";
// Types
export type {
    AuthActions,
    AuthContextValue,
    AuthFormMode,
    AuthFormProps,
    AuthState,
} from "./types";
// Null object patterns (P3-019)
export { EMPTY_AUTH_STATE, LOADING_AUTH_STATE } from "./types";
