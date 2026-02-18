/**
 * Login Page
 *
 * Login page with email/password form and link to register.
 * Uses AuthForm component from auth feature.
 * Handles callbackUrl for post-login redirects and success messages from registration.
 *
 * @module app/(auth)/login/page
 */

"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import type { JSX } from "react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { login } from "@/features/auth/actions/login.action"
import { AuthForm } from "@/features/auth/components/auth-form"

// =============================================================================
// Login Page Component
// =============================================================================

/**
 * Login page with email/password authentication.
 *
 * Supports callbackUrl query parameter for redirecting users to their intended
 * destination after login (e.g., /chat/123 when accessing a specific chat).
 *
 * Supports registered query parameter to show success message after registration.
 *
 * @example
 * ```tsx
 * // Route: /login
 * // Redirects to /chat on successful login
 *
 * // Route: /login?callbackUrl=/chat/abc123
 * // Redirects to /chat/abc123 on successful login
 *
 * // Route: /login?registered=true
 * // Shows success message from registration
 * ```
 */
export default function LoginPage(): JSX.Element {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [isPending, startTransition] = useTransition()
	const [error, setError] = useState<string | null>(null)

	// Get callbackUrl from query params (set by middleware for protected routes)
	const callbackUrl = searchParams.get("callbackUrl")
	// Check if user just registered (show success message)
	const justRegistered = searchParams.get("registered") === "true"

	/**
	 * Handle form submission
	 */
	function handleSubmit(formData: FormData): void {
		setError(null)

		startTransition(async () => {
			const result = await login(formData, callbackUrl)

			if (result.success) {
				// Redirect to intended page or default chat page
				router.push(result.redirectTo || "/chat")
				router.refresh()
			} else {
				setError(result.error || "Login failed. Please try again.")
			}
		})
	}

	return (
		<div className="flex flex-col gap-12">
			{/* Header */}
			<div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
				<h3 className="font-semibold text-xl dark:text-zinc-50">
					Sign In
				</h3>
				<p className="text-gray-500 text-sm dark:text-zinc-400">
					Use your email and password to sign in
				</p>
			</div>

			{/* Registration success message */}
			{justRegistered && (
				<div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
					<p className="text-center text-green-700 text-sm dark:text-green-400">
						Account created successfully! Please sign in with your
						new credentials.
					</p>
				</div>
			)}

			{/* Form */}
			<AuthForm action={handleSubmit}>
				<Button className="w-full" disabled={isPending} type="submit">
					{isPending ? "Signing in..." : "Sign in"}
				</Button>

				{/* Error message */}
				{error && (
					<p className="mt-2 text-center text-red-500 text-sm">
						{error}
					</p>
				)}

				{/* Link to register */}
				<p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
					{"Don't have an account? "}
					<Link
						className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
						href="/register"
					>
						Sign up
					</Link>
					{" for free."}
				</p>
			</AuthForm>
		</div>
	)
}
