/**
 * Session API Route
 *
 * Returns the current session state for client-side polling.
 * Used for multi-tab session synchronization.
 *
 * @module app/api/auth/session
 */

import { success } from "@/lib/api"
import { getSession } from "@/lib/auth/session"

/**
 * GET /api/auth/session
 * Returns the current session state.
 */
export async function GET() {
	const session = await getSession()

	return success({
		session,
	})
}
