/**
 * Logout API Route
 *
 * Server-side session termination endpoint.
 * Clears both NextAuth and guest session cookies.
 *
 * @module app/api/auth/logout
 */

import { cookies } from "next/headers"
import { error, success, validateOrigin } from "@/lib/api"
import { signOut } from "@/lib/auth"
import { ForbiddenError, InternalServerError } from "@/lib/errors"

/** Guest cookie name (must match session.ts) */
const GUEST_COOKIE_NAME = "guest_id"

/**
 * POST /api/auth/logout
 * Terminates the current session and clears all auth cookies.
 */
export async function POST(request: Request) {
	// CSRF Protection
	if (!validateOrigin(request)) {
		return error(new ForbiddenError("Invalid request origin"))
	}

	try {
		// Sign out via NextAuth (clears session)
		await signOut({ redirect: false })

		// Clear guest cookie if present
		const cookieStore = await cookies()
		cookieStore.delete(GUEST_COOKIE_NAME)

		return success({
			success: true,
			message: "Logged out successfully",
		})
	} catch {
		return error(new InternalServerError("Failed to sign out"))
	}
}
