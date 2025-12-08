import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
    createGuestSession,
    getAppSession,
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

/**
 * GET handler for server-side guest session creation with redirect.
 * Used when server-side pages need to create a guest session before rendering.
 * This fixes the race condition where direct navigation to /chat/[id] would
 * redirect to home before the client-side AuthProvider could create a guest session.
 */
export async function GET(request: Request) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const redirectUrl = url.searchParams.get("redirectUrl") || "/";

    // Validate redirectUrl to prevent open redirect vulnerability
    // Wrapped in helper to safely handle malformed URLs
    const getSafeRedirectUrl = (): string => {
        try {
            if (redirectUrl.startsWith("/")) {
                return redirectUrl;
            }
            if (
                redirectUrl.startsWith("http") &&
                new URL(redirectUrl).origin === url.origin
            ) {
                return redirectUrl;
            }
            return "/";
        } catch {
            // Malformed URL - default to root
            return "/";
        }
    };

    const safeRedirectUrl = getSafeRedirectUrl();

    try {
        // Check if session already exists
        const session = await getAppSession();
        if (session) {
            logger.info("Guest GET: session exists, redirecting", {
                userId: session.user.id,
                redirectUrl: safeRedirectUrl,
                duration: Date.now() - startTime,
            });
            return redirect(safeRedirectUrl);
        }

        // Create guest session
        const guest = await createGuestSession();
        if (!guest) {
            logger.warn("Guest GET: guest auth not configured, redirecting", {
                redirectUrl: safeRedirectUrl,
                duration: Date.now() - startTime,
            });
            return redirect(safeRedirectUrl);
        }

        logger.info("Guest GET: session created, redirecting", {
            guestId: guest.user.id,
            redirectUrl: safeRedirectUrl,
            duration: Date.now() - startTime,
        });

        return redirect(safeRedirectUrl);
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error("Guest GET: session creation failed", error, { duration });

        // On error, still redirect to avoid broken state
        return redirect(safeRedirectUrl);
    }
}
