import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireCustomRateLimitForRoute } from "@/lib/api/guards";
import { getClientIP, validateOrigin } from "@/lib/api/utils";
import { parseJsonBodyForRoute } from "@/lib/api/validators";
import {
    getSupabaseAccessTokenCookieName,
    getSupabaseSessionFromToken,
} from "@/lib/auth/session";
import { getSecureCookieOptions } from "@/lib/constants";
import { ChatSDKError } from "@/lib/errors";
import { logInfo, logWarn } from "@/lib/log";
import { RATE_LIMITS } from "@/lib/middleware/rate-limit-config";
import { exchangeRequestSchema } from "./schema";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

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
            namespace: RATE_LIMITS.AUTH_EXCHANGE.namespace,
        },
        "auth"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    // Parse and validate request body
    const bodyResult = await parseJsonBodyForRoute(
        request,
        exchangeRequestSchema,
        "auth/exchange"
    );
    if (bodyResult instanceof Response) {
        return bodyResult;
    }

    const { accessToken } = bodyResult;

    // Issue #23 Fix: Verify token BEFORE setting cookie
    // This prevents invalid tokens from persisting in cookies
    const session = await getSupabaseSessionFromToken(accessToken);

    // Return error if session creation failed
    if (!session?.user) {
        logWarn("Auth exchange failed - no user in session", {
            hasSession: !!session,
        });
        return new ChatSDKError(
            "unauthorized:auth",
            "Invalid or expired access token"
        ).toResponse();
    }

    // Task 7.11: Set maxAge on cookie matching Supabase token expiry
    // Default to 1 hour (3600 seconds) to match standard Supabase access token TTL
    const SUPABASE_ACCESS_TOKEN_TTL_SECONDS = 3600;
    const cookieStore = await cookies();
    cookieStore.set(
        getSupabaseAccessTokenCookieName(),
        accessToken,
        getSecureCookieOptions(SUPABASE_ACCESS_TOKEN_TTL_SECONDS)
    );

    // Task 7.4: Delete guest cookie on auth upgrade
    // This prevents session confusion and ensures clean auth state
    cookieStore.delete("guest_token");

    logInfo("Auth exchange completed", {
        hasUser: true,
        userId: session.user.id,
    });

    return NextResponse.json(
        {
            user: session.user,
        },
        { status: 200 }
    );
}
