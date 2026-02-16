/**
 * Register Server Action
 *
 * Handles new user registration with email and password.
 * Creates user account via authService and signs them in.
 *
 * @module features/auth/actions/register.action
 */

"use server"

import { redirect } from "next/navigation"
import { signIn } from "@/lib/auth"
import { authService } from "@/lib/data/services/auth.service"
import { registerSchema } from "../schemas"
import type { AuthResult } from "../types"

// =============================================================================
// Register Action
// =============================================================================

/**
 * Register a new user with email and password.
 *
 * @param formData - Form data containing email, password, and confirmPassword
 * @returns AuthResult indicating success or failure
 *
 * @example
 * ```tsx
 * // In a form component
 * <form action={register}>
 *   <input name="email" type="email" />
 *   <input name="password" type="password" />
 *   <input name="confirmPassword" type="password" />
 *   <button type="submit">Sign Up</button>
 * </form>
 * ```
 */
export async function register(formData: FormData): Promise<AuthResult> {
	// Extract credentials
	const email = formData.get("email")
	const password = formData.get("password")
	const confirmPassword = formData.get("confirmPassword")

	// Validate input
	const parsed = registerSchema.safeParse({
		email,
		password,
		confirmPassword,
	})

	if (!parsed.success) {
		const errorMessage = parsed.error.errors[0]?.message
		return {
			success: false,
			error: errorMessage || "Please provide valid registration details.",
		}
	}

	try {
		// Create user via auth service
		await authService.createUser({
			email: parsed.data.email,
			password: parsed.data.password,
		})

		// Sign in the newly registered user
		await signIn("credentials", {
			email: parsed.data.email,
			password: parsed.data.password,
			redirect: false,
		})

		return {
			success: true,
			redirectTo: "/chat",
		}
	} catch (error) {
		// Handle known errors
		if (error instanceof Error) {
			// Email already exists
			if (error.message.includes("already registered")) {
				return {
					success: false,
					error: "An account with this email already exists.",
				}
			}

			// Validation error
			if (error.message.includes("validation")) {
				return {
					success: false,
					error: "Please provide valid registration details.",
				}
			}
		}

		// Unknown error
		console.error("Registration error:", error)
		return {
			success: false,
			error: "Failed to create account. Please try again.",
		}
	}
}

/**
 * Register action that redirects after successful registration.
 * Use this when you want automatic redirect behavior.
 *
 * @param formData - Form data containing registration details
 */
export async function registerWithRedirect(formData: FormData): Promise<void> {
	const result = await register(formData)

	if (result.success && result.redirectTo) {
		redirect(result.redirectTo)
	}

	// If registration failed, the error is returned but not thrown
	// The calling component should handle the error display
}
