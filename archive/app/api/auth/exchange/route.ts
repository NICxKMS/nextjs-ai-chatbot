/**
 * Auth Token Exchange API Route
 * Exchanges Supabase auth token for session cookie
 *
 * POST /api/auth/exchange
 *
 * SEC-003: Includes guest-to-auth data migration
 * PERF-004: Includes cache prewarming after successful auth
 * P2-020: Uses Zod-validated Supabase env vars
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
    GUEST_TOKEN_COOKIE,
    getCookieOptions,
    isProductionEnvironment,
    SUPABASE_COOKIE_TTL_SECONDS,
} from "@/lib/auth/constants";
import { getSupabaseCookieName } from "@/lib/auth/cookies";
import { extractGuestIdFromToken } from "@/lib/auth/extract-guest";
import type { AppUser } from "@/lib/auth/types";
import { prewarmUserCache } from "@/lib/cache-ops";
import { env } from "@/lib/config/env";
import { authError, validationError } from "@/lib/errors";
import { AuthService } from "@/lib/services";

/**
 * Exchange Supabase access token for session cookie
 */
export async function POST(request: Request): Promise<Response> {
    // Parse request body
    let body: { accessToken?: unknown };
    try {
        body = await request.json();
    } catch {
        return validationError("Invalid JSON body").toResponse();
    }

    // Validate access token
    const { accessToken } = body;
    if (!accessToken || typeof accessToken !== "string") {
        return validationError("Missing or invalid accessToken").toResponse();
    }

    // Create Supabase client with validated env vars
    const supabase = createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return [];
                },
                setAll() {
                    // Read-only context
                },
            },
        }
    );

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
        return authError("invalid_token", {
            hasError: !!error,
        }).toResponse();
    }

    // Set the Supabase access token cookie
    const cookieStore = await cookies();
    const cookieName = getSupabaseCookieName();

    cookieStore.set(cookieName, accessToken, {
        ...getCookieOptions(isProductionEnvironment()),
        maxAge: SUPABASE_COOKIE_TTL_SECONDS,
    });

    // SEC-003: Migrate guest data to authenticated user
    // Check for guest token and migrate data before deleting the cookie
    const guestToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value;
    if (guestToken) {
        const guestId = extractGuestIdFromToken(guestToken);
        if (guestId) {
            // Await migration to prevent race condition with cookie deletion
            // The migration must complete before we delete the guest cookie
            const serviceResult = await AuthService.migrateGuestToAuthUser({
                guestId,
                authUserId: user.id,
            });

            if (!serviceResult.success) {
                // Log error but continue - don't block auth flow
                console.error("[SEC-003] Guest data migration service error", {
                    guestId,
                    authUserId: user.id,
                    error: serviceResult.error,
                    code: serviceResult.code,
                });
            }
            // Success/failure logging is handled by the service
        }
        // Delete guest cookie after migration attempt (success or failure)
        cookieStore.delete(GUEST_TOKEN_COOKIE);
    }

    // PERF-004: Prewarm caches for the authenticated user
    // Run in background - don't block the auth response
    prewarmUserCache(user.id, "regular").catch((error) => {
        console.error("[PERF-004] Cache prewarm error", {
            userId: user.id,
            error,
        });
    });

    // Build user response
    const appUser: AppUser = {
        id: user.id,
        type: "regular",
        email: user.email,
    };

    return NextResponse.json({ user: appUser }, { status: 200 });
}
