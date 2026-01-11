import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireCustomRateLimitForRoute } from "@/lib/api/guards";
import { getClientIP, validateOrigin } from "@/lib/api/utils";
import { getSupabaseAccessTokenCookieName } from "@/lib/auth/session";
import { ChatSDKError } from "@/lib/errors";
import { logInfo } from "@/lib/log";
import { RATE_LIMITS } from "@/lib/middleware/rate-limit-config";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

// Guest cookie name (should match session.ts)
const GUEST_COOKIE_NAME = "guest_token";

/**
 * Server-side logout endpoint.
 * Properly invalidates session by deleting auth cookies on the server side.
 * This is more secure than client-side only logout as it ensures cookies are cleared.
 */
export async function POST(request: Request) {
    // CSRF Protection: Validate Origin/Referer headers
    if (!validateOrigin(request)) {
        return new ChatSDKError(
            "forbidden:auth:csrf",
            "Invalid request origin"
        ).toResponse();
    }

    // Apply rate limiting by IP for auth endpoints
    const ip = getClientIP(request);

    const rateLimitResult = await requireCustomRateLimitForRoute(
        {
            strategy: "sliding_window",
            limit: RATE_LIMITS.AUTH_EXCHANGE.limit,
            window: RATE_LIMITS.AUTH_EXCHANGE.window,
            identifier: ip,
            namespace: "rate_limit:auth_logout",
        },
        "auth"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    const cookieStore = await cookies();

    // Delete the Supabase access token cookie
    const accessTokenCookieName = getSupabaseAccessTokenCookieName();
    cookieStore.delete(accessTokenCookieName);

    // Also delete guest cookie if present (clean slate)
    cookieStore.delete(GUEST_COOKIE_NAME);

    logInfo("Server-side logout completed", { ip });

    return NextResponse.json(
        { success: true, message: "Logged out successfully" },
        { status: 200 }
    );
}
