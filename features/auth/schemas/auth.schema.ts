/**
 * Auth Validation Schemas
 *
 * Zod validation schemas for authentication operations.
 *
 * @module features/auth/schemas/auth.schema
 */

import { z } from "zod"

// =============================================================================
// Login Schema
// =============================================================================

/**
 * Schema for login form validation
 */
export const loginSchema = z.object({
	email: z
		.string()
		.min(1, "Email is required")
		.email("Please enter a valid email address"),
	password: z.string().min(1, "Password is required"),
})

/**
 * Type inferred from login schema
 */
export type LoginInput = z.infer<typeof loginSchema>

// =============================================================================
// Register Schema
// =============================================================================

/**
 * Schema for registration form validation
 */
export const registerSchema = z
	.object({
		email: z
			.string()
			.min(1, "Email is required")
			.email("Please enter a valid email address"),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(100, "Password must be less than 100 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})

/**
 * Type inferred from register schema
 */
export type RegisterInput = z.infer<typeof registerSchema>

// =============================================================================
// Password Reset Schema
// =============================================================================

/**
 * Schema for password reset request
 */
export const resetPasswordSchema = z.object({
	email: z
		.string()
		.min(1, "Email is required")
		.email("Please enter a valid email address"),
})

/**
 * Type inferred from reset password schema
 */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// =============================================================================
// Update Password Schema
// =============================================================================

/**
 * Schema for updating password
 */
export const updatePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(100, "Password must be less than 100 characters"),
		confirmPassword: z.string().min(1, "Please confirm your new password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})

/**
 * Type inferred from update password schema
 */
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
