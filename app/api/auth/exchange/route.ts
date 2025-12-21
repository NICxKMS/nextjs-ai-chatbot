/**
 * Auth Token Exchange API Route
 * Exchanges Supabase auth token for session cookie
 *
 * POST /api/auth/exchange
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
    getCookieOptions,
    isProductionEnvironment,
    SUPABASE_COOKIE_TTL_SECONDS,
    GUEST_TOKEN_COOKIE,
} from "@/lib/auth/constants";
import { getSupabaseCookieName } from "@/lib/auth/cookies";
import { AppError, authError, validationError } from "@/lib/errors";
import type { AppUser } from "@/lib/auth/types";

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

    // Verify token with Supabase before setting cookie
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Delete guest cookie on auth upgrade
    cookieStore.delete(GUEST_TOKEN_COOKIE);

    // Build user response
    const appUser: AppUser = {
        id: user.id,
        type: "regular",
        email: user.email,
    };

    return NextResponse.json({ user: appUser }, { status: 200 });
}
