"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginSchema, registerSchema } from "@/features/auth/schemas/auth.schema"
import type { AuthActionData, AuthMode } from "@/features/auth/types/auth.types"
import type { ActionResult } from "@/lib/types/result.types"

// ── Form state ──────────────────────────────────────────────

/**
 * Local form state for `useActionState`.
 * Tracks both client-side Zod field errors and server-side error messages.
 */
interface AuthFormState {
	serverError?: string
	successMessage?: string
	fieldErrors?: Record<string, string[] | undefined>
}

// ── Props ───────────────────────────────────────────────────

interface AuthFormProps {
	/** Switches between login and register form variants. */
	mode: AuthMode
	/** Server action compatible with `useActionState` — `(prevState, formData) => Promise<ActionResult>`. */
	action: (
		prevState: ActionResult<AuthActionData>,
		formData: FormData,
	) => Promise<ActionResult<AuthActionData>>
}

// ── Component ───────────────────────────────────────────────

/**
 * Shared auth form for login and register pages.
 *
 * Uses React 19 `useActionState` for server action integration.
 * Validates input with Zod on the client before calling the server action.
 * Shows inline field errors and server error banners.
 */
export function AuthForm({ mode, action }: AuthFormProps) {
	const isLogin = mode === "login"

	async function handleAction(
		_prevState: AuthFormState | null,
		formData: FormData,
	): Promise<AuthFormState | null> {
		// 1. Client-side Zod validation
		const schema = isLogin ? loginSchema : registerSchema
		const raw: Record<string, unknown> = {
			email: formData.get("email"),
			password: formData.get("password"),
		}

		const parsed = schema.safeParse(raw)
		if (!parsed.success) {
			return { fieldErrors: parsed.error.flatten().fieldErrors }
		}

		// 2. Call server action
		// Server actions ignore prevState — pass a neutral value.
		const result = await action({ success: true, data: undefined }, formData)

		// 3. Handle result — server redirects on most successes; only errors
		//    and special cases (email confirmation) reach here.
		if (!result.success) {
			return { serverError: result.error.message }
		}

		// 4. Email confirmation required — show success message instead of redirecting
		if (result.data && "confirmationRequired" in result.data) {
			return {
				successMessage: "Account created! Please check your email for a confirmation link.",
			}
		}

		return null
	}

	const [state, formAction, isPending] = useActionState<AuthFormState | null, FormData>(
		handleAction,
		null,
	)

	return (
		<form
			action={formAction}
			className="flex flex-col gap-4 px-4 sm:px-16"
			data-testid="auth-form"
		>
			{/* Success message banner (e.g., email confirmation required) */}
			{state?.successMessage && (
				<output
					aria-live="polite"
					className="rounded-md bg-emerald-500/10 px-4 py-3 text-emerald-700 text-sm dark:text-emerald-400"
				>
					{state.successMessage}
				</output>
			)}

			{/* Server error banner */}
			{state?.serverError && (
				<div
					className="rounded-md bg-destructive/10 px-4 py-3 text-destructive text-sm"
					role="alert"
				>
					{state.serverError}
				</div>
			)}

			{/* Email field */}
			<div className="flex flex-col gap-2">
				<Label className="font-normal text-zinc-600 dark:text-zinc-400" htmlFor="email">
					Email Address
				</Label>
				<Input
					aria-describedby={state?.fieldErrors?.email?.[0] ? "email-error" : undefined}
					autoComplete="email"
					autoFocus
					className="bg-muted text-md md:text-sm"
					disabled={isPending}
					id="email"
					name="email"
					placeholder="user@acme.com"
					required
					type="email"
				/>
				{state?.fieldErrors?.email?.[0] && (
					<p className="text-destructive text-sm" id="email-error" role="alert">
						{state.fieldErrors.email[0]}
					</p>
				)}
			</div>

			{/* Password field */}
			<div className="flex flex-col gap-2">
				<Label className="font-normal text-zinc-600 dark:text-zinc-400" htmlFor="password">
					Password
				</Label>
				<Input
					aria-describedby={
						state?.fieldErrors?.password?.[0] ? "password-error" : undefined
					}
					autoComplete={isLogin ? "current-password" : "new-password"}
					className="bg-muted text-md md:text-sm"
					disabled={isPending}
					id="password"
					name="password"
					required
					type="password"
				/>
				{state?.fieldErrors?.password?.[0] && (
					<p className="text-destructive text-sm" id="password-error" role="alert">
						{state.fieldErrors.password[0]}
					</p>
				)}
			</div>

			{/* Submit button */}
			<Button
				data-testid={isLogin ? "login-button" : "register-button"}
				disabled={isPending}
				type="submit"
			>
				{isPending
					? isLogin
						? "Signing in…"
						: "Signing up…"
					: isLogin
						? "Sign In"
						: "Sign Up"}
			</Button>

			{/* Alternate mode link */}
			<p className="mt-4 text-center text-muted-foreground text-sm">
				{isLogin ? (
					<>
						{"Don't have an account? "}
						<Link
							className="font-semibold text-foreground hover:underline"
							href="/register"
						>
							Sign up
						</Link>
						{" for free."}
					</>
				) : (
					<>
						{"Already have an account? "}
						<Link
							className="font-semibold text-foreground hover:underline"
							href="/login"
						>
							Sign in
						</Link>
						{" instead."}
					</>
				)}
			</p>
		</form>
	)
}
