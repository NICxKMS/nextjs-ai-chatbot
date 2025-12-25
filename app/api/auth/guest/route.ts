/**
 * Guest Session API Route
 * Creates or retrieves guest session for anonymous users
 *
 * POST /api/auth/guest
 *
 * @security SEC-001: Rate limited to prevent session cycling attacks
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import type { AppUser } from "@/lib/auth/types";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/utils/logger";

/**
 * Create or retrieve guest session
 *
 * Returns existing Supabase session if authenticated,
 * existing guest session if present,
 * or creates new guest session.
 *
 * @security SEC-001: IP-based rate limiting prevents session cycling to bypass rate limits.
 * Users cannot create unlimited guest sessions by clearing cookies.
 */
export async function POST(request: Request): Promise<Response> {
    // SEC-001: Rate limit guest session creation per IP to prevent session cycling attacks
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

    const rateResult = await checkRateLimit(`guest-create:${ip}`, "strict");
    if (!rateResult.success) {
        const retryAfter = Math.ceil((rateResult.reset - Date.now()) / 1000);
        return new Response(
            JSON.stringify({
                error: "Too many session requests",
                retryAfter,
            }),
            {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "Retry-After": String(retryAfter),
                },
            }
        );
    }

    // Check for existing session (Supabase or guest)
    const existingSession = await getSession();

    if (existingSession) {
        // Return existing session
        return NextResponse.json(
            {
                user: existingSession.user,
                isNewSession: false,
            },
            { status: 200 }
        );
    }

    // Create new guest session
    try {
        const guestSession = await sessionManager.createGuestSession();

        const user: AppUser = {
            id: guestSession.user.id,
            type: "guest",
        };

        // isNewSession: true indicates brand new guest with no history
        // Consumers can skip initial history fetch
        return NextResponse.json(
            {
                user,
                isNewSession: true,
            },
            { status: 200 }
        );
    } catch (error) {
        // Guest session creation failed - log for visibility
        logger.error("[Guest API] Session creation failed", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return new AppError({
            code: "auth:guest_unavailable",
            message: "Guest authentication is not configured",
        }).toResponse();
    }
}

/**
 * GET handler for server-side guest session with redirect
 * Used when server-side pages need guest session before rendering
 */
export async function GET(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const redirectUrl = url.searchParams.get("redirectUrl") || "/";

    // Validate redirect URL - only allow relative paths
    const safeRedirectUrl = getSafeRedirectUrl(redirectUrl);

    const sessionManager = getSessionManager();

    // Get or create session (we just need to ensure a session exists)
    await sessionManager.getOrCreateSession();

    // Redirect with session info in search params if needed
    const redirect = new URL(safeRedirectUrl, url.origin);

    return NextResponse.redirect(redirect, { status: 302 });
}

/**
 * Validate and sanitize redirect URL
 * Only allows safe relative paths
 */
function getSafeRedirectUrl(redirectUrl: string): string {
    try {
        const normalizedUrl = decodeURIComponent(redirectUrl).trim();

        // Block dangerous schemes
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
        // Block protocol-relative URLs (//example.com)
        if (normalizedUrl.startsWith("/") && !normalizedUrl.startsWith("//")) {
            // Block path traversal attempts
            if (/^\/[\\]+/.test(normalizedUrl)) {
                return "/";
            }
            return normalizedUrl;
        }

        // For absolute URLs, reject external redirects
        return "/";
    } catch {
        return "/";
    }
}
