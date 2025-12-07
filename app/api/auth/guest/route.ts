import { NextResponse } from "next/server";
import {
    createGuestSession,
    getGuestSessionFromCookies,
    getSupabaseSessionFromCookies,
} from "@/lib/auth/session";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/monitoring/logger";

export async function POST() {
    const startTime = Date.now();

    try {
        // If a Supabase auth session exists, just return that user
        const supabaseSession = await getSupabaseSessionFromCookies();
        if (supabaseSession) {
            logger.info("Guest endpoint: returning existing Supabase session", {
                userId: supabaseSession.user.id,
                duration: Date.now() - startTime,
            });
            return NextResponse.json(
                { user: supabaseSession.user },
                { status: 200 }
            );
        }

        // If a guest session already exists, reuse it
        const existingGuest = await getGuestSessionFromCookies();
        if (existingGuest) {
            logger.info("Guest endpoint: reusing existing guest session", {
                guestId: existingGuest.user.id,
                duration: Date.now() - startTime,
            });
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

        const duration = Date.now() - startTime;
        logger.info("Guest session created", {
            guestId: guest.user.id,
            duration,
        });

        return NextResponse.json({ user: guest.user }, { status: 200 });
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error("Guest session creation failed", error, { duration });

        return new ChatSDKError(
            "offline:auth:guest_failed",
            "Failed to create guest session"
        ).toResponse();
    }
}
