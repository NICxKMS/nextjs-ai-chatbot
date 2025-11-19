import { NextResponse } from "next/server";
import {
	createGuestSession,
	getGuestSessionFromCookies,
	getSupabaseSessionFromCookies,
} from "@/lib/auth/session";
import { ChatSDKError } from "@/lib/errors";

export async function POST() {
	try {
		// If a Supabase auth session exists, just return that user
		const supabaseSession = await getSupabaseSessionFromCookies();
		if (supabaseSession) {
			return NextResponse.json(
				{ user: supabaseSession.user },
				{ status: 200 }
			);
		}

		// If a guest session already exists, reuse it
		const existingGuest = await getGuestSessionFromCookies();
		if (existingGuest) {
			return NextResponse.json(
				{ user: existingGuest.user },
				{ status: 200 }
			);
		}

		// Otherwise, create a new guest session and set the cookie
		const guest = await createGuestSession();
		if (!guest) {
			return new ChatSDKError(
				"bad_request:auth:guest_unavailable",
				"Guest authentication is not configured"
			).toResponse();
		}

		return NextResponse.json({ user: guest.user }, { status: 200 });
	} catch {
		return new ChatSDKError(
			"offline:auth:guest_failed",
			"Failed to create guest session"
		).toResponse();
	}
}


