"use server"

import { redirect } from "next/navigation"

import {
	authServiceUnavailableResult,
	enforceAuthRateLimit,
	migrateGuestChatsAndClearToken,
} from "@/features/auth/lib/action-utils"
import { createSupabaseActionClient } from "@/features/auth/lib/supabase-action"
import { registerSchema } from "@/features/auth/schemas/auth.schema"
import type { AuthActionData } from "@/features/auth/types/auth.types"
import { rateLimitKeys } from "@/lib/cache/keys"
import { createUser } from "@/lib/data/user"
import type { ActionResult } from "@/lib/types/result.types"

/** Maximum registration attempts per IP per minute. */
const REGISTER_RATE_LIMIT = 3
/** Rate limit window in seconds (1 minute). */
const REGISTER_RATE_WINDOW_SECONDS = 60

// ── Server Action ──────────────────────────────────────────────

/**
 * Create a new account with email and password.
 *
 * Compatible with `useActionState` — accepts `(prevState, formData)`.
 * Creates both a Supabase auth user and a local DB user record.
 * On immediate-session success: migrates guest data, clears the guest token,
 * and redirects to "/".
 * On confirmation-required success: returns structured success and preserves
 * guest continuity until the user completes an authenticated login.
 * On failure: returns structured error (never throws).
 */
export async function register(
	_prevState: ActionResult<AuthActionData>,
	formData: FormData,
): Promise<ActionResult<AuthActionData>> {
	// 1. Validate input
	const parsed = registerSchema.safeParse({
		email: formData.get("email"),
		password: formData.get("password"),
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

	// 2. Rate limit — 3 attempts/min per IP (graceful: skip if Redis unavailable)
	const rateLimitResult = await enforceAuthRateLimit({
		createKey: rateLimitKeys.rateLimitRegister,
		limit: REGISTER_RATE_LIMIT,
		windowSeconds: REGISTER_RATE_WINDOW_SECONDS,
		errorCode: "rate_limit:auth:register_too_many",
		errorMessage: "Too many registration attempts. Please try again later.",
	})

	if (rateLimitResult) {
		return rateLimitResult
	}

	// 3. Create Supabase action client
	const supabase = await createSupabaseActionClient()
	if (!supabase) {
		return authServiceUnavailableResult()
	}

	// 4. Create Supabase auth user
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

	// 5. Create local DB user record (links Supabase user to app data)
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

	// 6. Handle email confirmation requirement
	// When email confirmation is required, Supabase returns user but no session.
	if (!data.session) {
		return {
			success: true,
			data: { confirmationRequired: true },
		}
	}

	// 7. Migrate guest data + clear stale guest token once auth is real
	await migrateGuestChatsAndClearToken(data.user.id, "register")

	// 8. Redirect to home (throws NEXT_REDIRECT — must be outside try/catch)
	redirect("/")
}
