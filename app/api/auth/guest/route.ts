import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
    createGuestSession,
    getAppSession,
    getGuestSessionFromCookies,
    getSupabaseSessionFromCookies,
} from "@/lib/auth/session";
import { ChatSDKError } from "@/lib/errors";
import { trackUserAction } from "@/lib/monitoring/dashboard";
import { logger } from "@/lib/monitoring/logger";
import { recordEvent } from "@/lib/monitoring/newrelic-agent";
import { withPerformanceTracking } from "@/lib/monitoring/performance";

export const POST = withPerformanceTracking(
    "POST /api/auth/guest",
    async () => {
        // If a Supabase auth session exists, just return that user
        const supabaseSession = await getSupabaseSessionFromCookies();
        if (supabaseSession) {
            logger.info("Guest endpoint: returning existing Supabase session", {
                userId: supabaseSession.user.id,
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

        logger.info("Guest session created", {
            guestId: guest.user.id,
        });

        // Track user action for New Relic dashboard
        trackUserAction("guest_session_created", {
            guestId: guest.user.id,
            method: "POST",
        });

        // Send Log event for dashboard "Guest vs Authenticated Sessions" widget
        recordEvent("Log", {
            message: "Guest session created",
            guestId: guest.user.id,
            method: "POST",
        });

        return NextResponse.json({ user: guest.user }, { status: 200 });
    }
);

/**
 * GET handler for server-side guest session creation with redirect.
 * Used when server-side pages need to create a guest session before rendering.
 * This fixes the race condition where direct navigation to /chat/[id] would
 * redirect to home before the client-side AuthProvider could create a guest session.
 */
export const GET = withPerformanceTracking(
    "GET /api/auth/guest",
    async (request: Request) => {
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

        // Check if session already exists
        const session = await getAppSession();
        if (session) {
            logger.info("Guest GET: session exists, redirecting", {
                userId: session.user.id,
                redirectUrl: safeRedirectUrl,
            });
            return redirect(safeRedirectUrl);
        }

        // Create guest session
        const guest = await createGuestSession();
        if (!guest) {
            logger.warn("Guest GET: guest auth not configured, redirecting", {
                redirectUrl: safeRedirectUrl,
            });
            return redirect(safeRedirectUrl);
        }

        logger.info("Guest GET: session created, redirecting", {
            guestId: guest.user.id,
            redirectUrl: safeRedirectUrl,
        });

        // Track user action for New Relic dashboard
        trackUserAction("guest_session_created", {
            guestId: guest.user.id,
            method: "GET",
        });

        // Send Log event for dashboard "Guest vs Authenticated Sessions" widget
        recordEvent("Log", {
            message: "Guest session created",
            guestId: guest.user.id,
            method: "GET",
        });

        return redirect(safeRedirectUrl);
    },
    {
        extractMetadata: (request) => {
            const url = new URL(request.url);
            return { redirectUrl: url.searchParams.get("redirectUrl") ?? "/" };
        },
    }
);
