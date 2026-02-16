/**
 * Guest Session API Route
 *
 * Creates or retrieves a guest session for unauthenticated users.
 * Enables chat functionality without requiring authentication.
 *
 * @module app/api/auth/guest
 */

import { NextResponse } from "next/server"
import { success } from "@/lib/api"
import { getOrCreateGuestSession, getSession } from "@/lib/auth"

/**
 * POST /api/auth/guest
 * Creates a new guest session or returns existing session.
 */
export async function POST() {
	// Check for existing session (auth or guest)
	const session = await getSession()

	if (session) {
		return success({
			user: session.user,
			isNewSession: false,
		})
	}

	// Create new guest session
	const guestSession = await getOrCreateGuestSession()

	return success({
		user: guestSession.user,
		isNewSession: true,
	})
}

/**
 * GET /api/auth/guest
 * Server-side guest session creation with redirect support.
 */
export async function GET(request: Request) {
	const url = new URL(request.url)
	const redirectUrl = url.searchParams.get("redirectUrl") || "/"

	// Check for existing session
	const session = await getSession()
	if (session) {
		return NextResponse.redirect(new URL(redirectUrl, url.origin))
	}

	// Create guest session and redirect
	await getOrCreateGuestSession()
	return NextResponse.redirect(new URL(redirectUrl, url.origin))
}
