/**
 * Auth Form Component
 *
 * Reusable authentication form for login and registration.
 * Handles email/password input with validation.
 *
 * @module features/auth/components/auth-form
 */

"use client"

import Form from "next/form"
import type { JSX } from "react"
import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AuthFormProps } from "../types"

// =============================================================================
// Auth Form Component
// =============================================================================

/**
 * Authentication form with email/password fields.
 *
 * @param props - Component props
 * @param props.action - Form action (URL string or server action function)
 * @param props.children - Form submit button and additional content
 * @param props.defaultEmail - Default email value for registration flow
 * @param props.showConfirmPassword - Show confirm password field for registration
 *
 * @example
 * ```tsx
 * // Login form
 * <AuthForm action={login}>
 *   <SubmitButton>Sign In</SubmitButton>
 * </AuthForm>
 *
 * // Registration form
 * <AuthForm action={register} defaultEmail="user@example.com" showConfirmPassword>
 *   <SubmitButton>Sign Up</SubmitButton>
 * </AuthForm>
 * ```
 */
export function AuthForm({
	action,
	children,
	defaultEmail = "",
	showConfirmPassword = false,
}: AuthFormProps): JSX.Element {
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [passwordError, setPasswordError] = useState<string | null>(null)

	/**
	 * Validate password match on confirm password blur
	 */
	function handleConfirmPasswordBlur(): void {
		if (confirmPassword && password !== confirmPassword) {
			setPasswordError("Passwords do not match")
		} else {
			setPasswordError(null)
		}
	}

	/**
	 * Clear error when password changes
	 */
	function handlePasswordChange(
		e: React.ChangeEvent<HTMLInputElement>,
	): void {
		setPassword(e.target.value)
		if (passwordError) {
			setPasswordError(null)
		}
	}

	/**
	 * Handle confirm password change
	 */
	function handleConfirmPasswordChange(
		e: React.ChangeEvent<HTMLInputElement>,
	): void {
		setConfirmPassword(e.target.value)
		if (passwordError && e.target.value === password) {
			setPasswordError(null)
		}
	}

	return (
		<Form action={action} className="flex flex-col gap-4 px-4 sm:px-16">
			<div className="flex flex-col gap-2">
				<Label
					className="font-normal text-zinc-600 dark:text-zinc-400"
					htmlFor="email"
				>
					Email Address
				</Label>

				<Input
					autoComplete="email"
					autoFocus
					className="bg-muted text-md md:text-sm"
					defaultValue={defaultEmail}
					id="email"
					name="email"
					placeholder="user@acme.com"
					required
					type="email"
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label
					className="font-normal text-zinc-600 dark:text-zinc-400"
					htmlFor="password"
				>
					Password
				</Label>

				<Input
					className="bg-muted text-md md:text-sm"
					id="password"
					name="password"
					onChange={handlePasswordChange}
					required
					type="password"
				/>
			</div>

			{showConfirmPassword && (
				<div className="flex flex-col gap-2">
					<Label
						className="font-normal text-zinc-600 dark:text-zinc-400"
						htmlFor="confirmPassword"
					>
						Confirm Password
					</Label>

					<Input
						aria-invalid={!!passwordError}
						aria-describedby={
							passwordError ? "confirmPassword-error" : undefined
						}
						className="bg-muted text-md md:text-sm"
						id="confirmPassword"
						name="confirmPassword"
						onBlur={handleConfirmPasswordBlur}
						onChange={handleConfirmPasswordChange}
						required
						type="password"
					/>

					{passwordError && (
						<p
							className="text-red-500 text-sm"
							id="confirmPassword-error"
							role="alert"
						>
							{passwordError}
						</p>
					)}
				</div>
			)}

			{children}
		</Form>
	)
}
