/**
 * Register Page
 *
 * Registration page with email/password form and link to login.
 * Uses AuthForm component from auth feature.
 *
 * @module app/(auth)/register/page
 */

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { JSX } from "react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { register } from "@/features/auth/actions/register.action"
import { AuthForm } from "@/features/auth/components/auth-form"

// =============================================================================
// Register Page Component
// =============================================================================

/**
 * Registration page with email/password form.
 *
 * @example
 * ```tsx
 * // Route: /register
 * // Redirects to /chat on successful registration
 * ```
 */
export default function RegisterPage(): JSX.Element {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [error, setError] = useState<string | null>(null)

	/**
	 * Handle form submission
	 */
	function handleSubmit(formData: FormData): void {
		setError(null)

		startTransition(async () => {
			const result = await register(formData)

			if (result.success) {
				// Redirect to chat on successful registration
				router.push(result.redirectTo || "/chat")
				router.refresh()
			} else {
				setError(
					result.error || "Registration failed. Please try again.",
				)
			}
		})
	}

	return (
		<div className="flex flex-col gap-12">
			{/* Header */}
			<div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
				<h3 className="font-semibold text-xl dark:text-zinc-50">
					Sign Up
				</h3>
				<p className="text-gray-500 text-sm dark:text-zinc-400">
					Create an account with your email and password
				</p>
			</div>

			{/* Form */}
			<AuthForm action={handleSubmit}>
				<Button className="w-full" disabled={isPending} type="submit">
					{isPending ? "Creating account..." : "Sign Up"}
				</Button>

				{/* Error message */}
				{error && (
					<p className="mt-2 text-center text-red-500 text-sm">
						{error}
					</p>
				)}

				{/* Link to login */}
				<p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
					{"Already have an account? "}
					<Link
						className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
						href="/login"
					>
						Sign in
					</Link>
					{" instead."}
				</p>
			</AuthForm>
		</div>
	)
}
