/**
 * Login Server Action
 *
 * Handles user authentication with email and password.
 * Integrates with NextAuth v5 for session management.
 * Supports callbackUrl for post-login redirects.
 *
 * @module features/auth/actions/login.action
 */

"use server"

import { redirect } from "next/navigation"
import { AuthError } from "next-auth"
import { signIn } from "@/lib/auth"
import { loginSchema } from "../schemas"
import type { AuthResult } from "../types"

// =============================================================================
// Login Action
// =============================================================================

/**
 * Authenticate a user with email and password.
 *
 * @param formData - Form data containing email and password
 * @param callbackUrl - Optional URL to redirect to after successful login
 * @returns AuthResult indicating success or failure
 *
 * @example
 * ```tsx
 * // In a form component
 * <form action={login}>
 *   <input name="email" type="email" />
 *   <input name="password" type="password" />
 *   <button type="submit">Sign In</button>
 * </form>
 *
 * // With callback URL
 * const result = await login(formData, "/chat/abc123");
 * ```
 */
export async function login(
	formData: FormData,
	callbackUrl?: string | null,
): Promise<AuthResult> {
	// Extract and validate credentials
	const email = formData.get("email")
	const password = formData.get("password")

	// Validate input
	const parsed = loginSchema.safeParse({ email, password })
	if (!parsed.success) {
		return {
			success: false,
			error: "Please provide a valid email and password.",
		}
	}

	try {
		// Attempt to sign in with NextAuth
		await signIn("credentials", {
			email: parsed.data.email,
			password: parsed.data.password,
			redirect: false,
		})

		// If we reach here without an error, login was successful
		// Use callbackUrl if provided, otherwise default to /chat
		return {
			success: true,
			redirectTo: callbackUrl || "/chat",
		}
	} catch (error) {
		// Handle NextAuth errors
		if (error instanceof AuthError) {
			switch (error.type) {
				case "CredentialsSignin":
					return {
						success: false,
						error: "Invalid email or password.",
					}
				default:
					return {
						success: false,
						error: "An error occurred during sign in. Please try again.",
					}
			}
		}

		// If redirect was thrown, this is expected behavior for successful login
		// NextAuth throws a redirect to complete the flow
		if (error instanceof Error && error.message === "NEXT_REDIRECT") {
			throw error // Re-throw to let Next.js handle the redirect
		}

		// Unknown error
		return {
			success: false,
			error: "An unexpected error occurred. Please try again.",
		}
	}
}

/**
 * Login action that redirects after successful authentication.
 * Use this when you want automatic redirect behavior.
 *
 * @param formData - Form data containing email and password
 */
export async function loginWithRedirect(formData: FormData): Promise<void> {
	const result = await login(formData)

	if (result.success && result.redirectTo) {
		redirect(result.redirectTo)
	}

	// If login failed, the error is returned but not thrown
	// The calling component should handle the error display
}
