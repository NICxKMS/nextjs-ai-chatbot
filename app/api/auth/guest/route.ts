import { NextResponse } from "next/server";
import { requireCustomRateLimitForRoute } from "@/lib/api/guards";
import { getClientIP, validateOrigin } from "@/lib/api/utils";
import {
    createGuestSession,
    getAppSession,
    getGuestSessionFromCookies,
    getSupabaseSessionFromCookies,
} from "@/lib/auth/session";
import { ChatSDKError } from "@/lib/errors";
import { logInfo, logWarn } from "@/lib/log";
import { RATE_LIMITS } from "@/lib/middleware/rate-limit-config";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

// Issue #21 Fix: Regex to detect path traversal attempts with backslashes
// Defined at top level for performance (avoids recompilation on each request)
const PATH_TRAVERSAL_REGEX = /^\/[\\]+/;

export async function POST(request: Request) {
    // CSRF Protection: Validate Origin/Referer headers
    if (!validateOrigin(request)) {
        return new ChatSDKError(
            "forbidden:auth:csrf",
            "Invalid request origin"
        ).toResponse();
    }

    // Apply rate limiting by IP for guest creation
    const ip = getClientIP(request);

    const rateLimitResult = await requireCustomRateLimitForRoute(
        {
            strategy: "sliding_window",
            limit: RATE_LIMITS.AUTH_GUEST.limit,
            window: RATE_LIMITS.AUTH_GUEST.window,
            identifier: ip,
            namespace: RATE_LIMITS.AUTH_GUEST.namespace,
        },
        "auth"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    // If a Supabase auth session exists, just return that user
    const supabaseSession = await getSupabaseSessionFromCookies();
    if (supabaseSession) {
        logInfo("Guest endpoint: returning existing Supabase session", {
            userId: supabaseSession.user.id,
        });
        return NextResponse.json(
            { user: supabaseSession.user, isNewSession: false },
            { status: 200 }
        );
    }

    // If a guest session already exists, reuse it
    const existingGuest = await getGuestSessionFromCookies();
    if (existingGuest) {
        // Task 7.12: Log truncated guest ID for privacy (first 8 chars after "guest:" prefix)
        const guestIdPrefix = existingGuest.user.id
            .replace("guest:", "")
            .slice(0, 8);
        logInfo("Guest endpoint: reusing existing guest session", {
            guestIdPrefix,
        });
        return NextResponse.json(
            { user: existingGuest.user, isNewSession: false },
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

    // Task 7.12: Log truncated guest ID for privacy (first 8 chars after "guest:" prefix)
    const guestIdPrefix = guest.user.id.replace("guest:", "").slice(0, 8);
    logInfo("Guest session created", {
        guestIdPrefix,
    });

    // isNewSession: true indicates this is a brand new guest with no history
    // Consumers can skip initial history fetch to avoid wasted network call
    return NextResponse.json(
        { user: guest.user, isNewSession: true },
        { status: 200 }
    );
}

/**
 * GET handler for server-side guest session creation with redirect.
 * Used when server-side pages need to create a guest session before rendering.
 * This fixes the race condition where direct navigation to /chat/[id] would
 * redirect to home before the client-side AuthProvider could create a guest session.
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const redirectUrl = url.searchParams.get("redirectUrl") || "/";

    // Issue #21 Fix: Improved open redirect protection
    // - Only allow relative paths starting with /
    // - For absolute URLs, verify protocol is http/https AND origin matches
    // - Block javascript:, data:, and other dangerous schemes
    // - Normalize URL to prevent encoding bypass attacks
    const getSafeRedirectUrl = (): string => {
        try {
            // Normalize the redirect URL to handle encoding attacks
            const normalizedUrl = decodeURIComponent(redirectUrl).trim();

            // Block URLs that start with dangerous schemes (case-insensitive)
            const lowerUrl = normalizedUrl.toLowerCase();
            if (
                lowerUrl.startsWith("javascript:") ||
                lowerUrl.startsWith("data:") ||
                lowerUrl.startsWith("vbscript:") ||
                lowerUrl.startsWith("file:")
            ) {
                return "/";
            }

            // Allow relative paths starting with /
            // But block protocol-relative URLs (//example.com)
            if (
                normalizedUrl.startsWith("/") &&
                !normalizedUrl.startsWith("//")
            ) {
                // Prevent path traversal attempts that could lead to external redirects
                // e.g., /\example.com or /\\example.com
                if (PATH_TRAVERSAL_REGEX.test(normalizedUrl)) {
                    return "/";
                }
                return normalizedUrl;
            }

            // For absolute URLs, parse and validate
            const parsed = new URL(normalizedUrl);

            // Issue #21 Fix: Only allow http and https protocols
            // This blocks javascript:, data:, vbscript:, and other dangerous schemes
            if (!["http:", "https:"].includes(parsed.protocol)) {
                return "/";
            }

            // Verify origin matches to prevent external redirects
            if (parsed.origin === url.origin) {
                return normalizedUrl;
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
        logInfo("Guest GET: session exists, redirecting", {
            userId: session.user.id,
            redirectUrl: safeRedirectUrl,
        });
        // Issue #22 Fix: Use NextResponse.redirect() for route handlers
        return NextResponse.redirect(new URL(safeRedirectUrl, url.origin));
    }

    // Create guest session
    const guest = await createGuestSession();
    if (!guest) {
        logWarn("Guest GET: guest auth not configured, redirecting", {
            redirectUrl: safeRedirectUrl,
        });
        // Issue #22 Fix: Use NextResponse.redirect() for route handlers
        return NextResponse.redirect(new URL(safeRedirectUrl, url.origin));
    }

    logInfo("Guest GET: session created, redirecting", {
        guestId: guest.user.id,
        redirectUrl: safeRedirectUrl,
    });

    // Issue #22 Fix: Use NextResponse.redirect() for route handlers
    return NextResponse.redirect(new URL(safeRedirectUrl, url.origin));
}
