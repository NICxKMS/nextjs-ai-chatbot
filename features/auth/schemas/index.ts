/**
 * Auth Schemas Barrel Export
 *
 * Re-exports all authentication validation schemas.
 *
 * @module features/auth/schemas
 */

export {
	type LoginInput,
	loginSchema,
	type RegisterInput,
	type ResetPasswordInput,
	registerSchema,
	resetPasswordSchema,
	type UpdatePasswordInput,
	updatePasswordSchema,
} from "./auth.schema"
