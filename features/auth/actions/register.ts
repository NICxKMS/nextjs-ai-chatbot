"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createSupabaseActionClient } from "@/features/auth/lib/supabase-action"
import { registerSchema } from "@/features/auth/schemas/auth.schema"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import { createUser } from "@/lib/data/user"
import type { ActionResult } from "@/lib/types/result.types"

// ── Server Action ──────────────────────────────────────────────

/**
 * Create a new account with email and password.
 *
 * Compatible with `useActionState` — accepts `(prevState, formData)`.
 * Creates both a Supabase auth user and a local DB user record.
 * On success: clears guest token, redirects to "/" (or "/login" if email
 * confirmation is required by the Supabase project).
 * On failure: returns structured error (never throws).
 */
export async function register(
	_prevState: ActionResult<void>,
	formData: FormData,
): Promise<ActionResult<void>> {
	// 1. Validate input
	const parsed = registerSchema.safeParse({
		email: formData.get("email"),
		password: formData.get("password"),
		name: formData.get("name") || undefined,
	})

	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "Invalid registration data",
			},
		}
	}

	// 2. Create Supabase action client
	const supabase = await createSupabaseActionClient()
	if (!supabase) {
		return {
			success: false,
			error: {
				code: "offline:api:service_unavailable",
				message: "Auth service is unavailable",
			},
		}
	}

	// 3. Create Supabase auth user
	const { data, error: signUpError } = await supabase.auth.signUp({
		email: parsed.data.email,
		password: parsed.data.password,
	})

	if (signUpError || !data.user) {
		return {
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: signUpError?.message ?? "Failed to create account",
			},
		}
	}

	// 4. Create local DB user record (links Supabase user to app data)
	try {
		await createUser({
			id: data.user.id,
			email: parsed.data.email.toLowerCase(),
		})
	} catch {
		// Supabase user exists but DB record failed.
		// The user can still log in — reconciliation can happen later.
		return {
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Account created but profile setup failed. Please try logging in.",
			},
		}
	}

	// 5. Clear stale guest token
	const cookieStore = await cookies()
	cookieStore.delete(GUEST_COOKIE_NAME)

	// 6. Redirect (throws NEXT_REDIRECT — must be outside try/catch)
	// When email confirmation is required, Supabase returns user but no session.
	if (!data.session) {
		redirect("/login")
	}

	redirect("/")
}
