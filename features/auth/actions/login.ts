"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { createSupabaseActionClient } from "@/features/auth/lib/supabase-action"
import { loginSchema } from "@/features/auth/schemas/auth.schema"
import type { AuthActionData } from "@/features/auth/types/auth.types"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import { verifyGuestToken } from "@/lib/auth/guest"
import { expire, incr } from "@/lib/cache/client"
import { rateLimitKeys } from "@/lib/cache/keys"
import { transferGuestChats } from "@/lib/data/chat"
import { createUser, getUserById } from "@/lib/data/user"
import type { ActionResult } from "@/lib/types/result.types"

/** Maximum login attempts per IP per minute. */
const LOGIN_RATE_LIMIT = 5
/** Rate limit window in seconds (1 minute). */
const LOGIN_RATE_WINDOW_SECONDS = 60

// ── Server Action ──────────────────────────────────────────────

/**
 * Sign in with email and password.
 *
 * Compatible with `useActionState` — accepts `(prevState, formData)`.
 * On success: clears guest token, redirects to "/".
 * On failure: returns structured error (never throws).
 */
export async function login(
	_prevState: ActionResult<AuthActionData>,
	formData: FormData,
): Promise<ActionResult<AuthActionData>> {
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

	// 2. Rate limit — 5 attempts/min per IP (graceful: skip if Redis unavailable)
	const headerStore = await headers()
	const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
	const rateLimitKey = rateLimitKeys.rateLimitLogin(ip)
	const count = await incr(rateLimitKey)
	if (count !== null) {
		if (count === 1) {
			await expire(rateLimitKey, LOGIN_RATE_WINDOW_SECONDS)
		}
		if (count > LOGIN_RATE_LIMIT) {
			return {
				success: false,
				error: {
					code: "rate_limit:auth:login_too_many",
					message: "Too many login attempts. Please try again later.",
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

	// 4. Sign in with Supabase (sets auth cookies via setAll callback)
	const { data, error } = await supabase.auth.signInWithPassword({
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

	// 5. Reconcile partial registration failure (D012)
	// If Supabase signUp succeeded but createUser failed during registration,
	// the user exists in Supabase but has no local DB record. Fix it here.
	if (data.user) {
		try {
			const existingUser = await getUserById(data.user.id)
			if (!existingUser) {
				await createUser({
					id: data.user.id,
					email: (data.user.email ?? parsed.data.email).toLowerCase(),
				})
			}
		} catch (reconciliationError) {
			// Best-effort: don't block login if DB reconciliation fails.
			// The user is authenticated via Supabase regardless.
			console.error("[login] D012 reconciliation failed:", reconciliationError)
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
							`[login] Migrated ${count} guest chat(s) to user ${data.user.id}`,
						)
					}
				}
			} catch (migrationError) {
				console.error("[login] Guest data migration failed:", migrationError)
			}
		}
		cookieStore.delete(GUEST_COOKIE_NAME)
	}

	// 7. Redirect to home (throws NEXT_REDIRECT — must be outside try/catch)
	redirect("/")
}
