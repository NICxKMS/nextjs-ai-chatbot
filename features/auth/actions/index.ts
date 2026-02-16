/**
 * Auth Actions Barrel Export
 *
 * Re-exports all authentication server actions.
 *
 * @module features/auth/actions
 */

export {
	login,
	loginWithRedirect,
} from "./login.action"
export {
	logout,
	logoutWithRedirect,
} from "./logout.action"
export {
	register,
	registerWithRedirect,
} from "./register.action"
