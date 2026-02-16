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
 *
 * @example
 * ```tsx
 * // Login form
 * <AuthForm action={login}>
 *   <SubmitButton>Sign In</SubmitButton>
 * </AuthForm>
 *
 * // Registration form
 * <AuthForm action={register} defaultEmail="user@example.com">
 *   <SubmitButton>Sign Up</SubmitButton>
 * </AuthForm>
 * ```
 */
export function AuthForm({
	action,
	children,
	defaultEmail = "",
}: AuthFormProps): JSX.Element {
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
					required
					type="password"
				/>
			</div>

			{children}
		</Form>
	)
}
