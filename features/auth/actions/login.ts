"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createSupabaseActionClient } from "@/features/auth/lib/supabase-action"
import { loginSchema } from "@/features/auth/schemas/auth.schema"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import type { ActionResult } from "@/lib/types/result.types"

// ── Server Action ──────────────────────────────────────────────

/**
 * Sign in with email and password.
 *
 * Compatible with `useActionState` — accepts `(prevState, formData)`.
 * On success: clears guest token, redirects to "/".
 * On failure: returns structured error (never throws).
 */
export async function login(
	_prevState: ActionResult<void>,
	formData: FormData,
): Promise<ActionResult<void>> {
	// 1. Validate input
	const parsed = loginSchema.safeParse({
		email: formData.get("email"),
		password: formData.get("password"),
	})

	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "Invalid email or password format",
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

	// 3. Sign in with Supabase (sets auth cookies via setAll callback)
	const { error } = await supabase.auth.signInWithPassword({
		email: parsed.data.email,
		password: parsed.data.password,
	})

	if (error) {
		return {
			success: false,
			error: {
				code: "unauthorized:auth:no_session",
				message: "Invalid email or password",
			},
		}
	}

	// 4. Clear stale guest token
	const cookieStore = await cookies()
	cookieStore.delete(GUEST_COOKIE_NAME)

	// 5. Redirect to home (throws NEXT_REDIRECT — must be outside try/catch)
	redirect("/")
}
