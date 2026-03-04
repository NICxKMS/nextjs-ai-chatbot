"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { createSupabaseActionClient } from "@/features/auth/lib/supabase-action"
import { registerSchema } from "@/features/auth/schemas/auth.schema"
import type { AuthActionData } from "@/features/auth/types/auth.types"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import { verifyGuestToken } from "@/lib/auth/guest"
import { expire, incr } from "@/lib/cache/client"
import { rateLimitKeys } from "@/lib/cache/keys"
import { transferGuestChats } from "@/lib/data/chat"
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
 * On success: clears guest token, redirects to "/" (or "/login" if email
 * confirmation is required by the Supabase project).
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

	// 2. Rate limit — 3 attempts/min per IP (graceful: skip if Redis unavailable)
	const headerStore = await headers()
	const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
	const rateLimitKey = rateLimitKeys.rateLimitRegister(ip)
	const count = await incr(rateLimitKey)
	if (count !== null) {
		if (count === 1) {
			await expire(rateLimitKey, REGISTER_RATE_WINDOW_SECONDS)
		}
		if (count > REGISTER_RATE_LIMIT) {
			return {
				success: false,
				error: {
					code: "rate_limit:auth:register_too_many",
					message: "Too many registration attempts. Please try again later.",
				},
			}
		}
	}

	// 3. Create Supabase action client
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

	// 6. Migrate guest data + clear stale guest token
	const cookieStore = await cookies()
	const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value
	if (guestToken) {
		// Best-effort migration — don't fail auth if migration fails
		if (data.user) {
			try {
				const guest = await verifyGuestToken(guestToken)
				if (guest) {
					const count = await transferGuestChats(guest.userId, data.user.id)
					if (count > 0) {
						console.info(
							`[register] Migrated ${count} guest chat(s) to user ${data.user.id}`,
						)
					}
				}
			} catch (migrationError) {
				console.error("[register] Guest data migration failed:", migrationError)
			}
		}
		cookieStore.delete(GUEST_COOKIE_NAME)
	}

	// 7. Handle email confirmation requirement
	// When email confirmation is required, Supabase returns user but no session.
	if (!data.session) {
		return {
			success: true,
			data: { confirmationRequired: true },
		}
	}

	// 8. Redirect to home (throws NEXT_REDIRECT — must be outside try/catch)
	redirect("/")
}
