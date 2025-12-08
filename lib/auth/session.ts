import "server-only";

import type { JWTPayload } from "jose";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { isProductionEnvironment } from "@/lib/constants";
import { generateUUID } from "@/lib/utils";

export type AppUserType = "guest" | "regular";

export type AppSessionUser = {
    id: string;
    type: AppUserType;
    email?: string | null;
};

export type AppSession = {
    user: AppSessionUser;
};

type JwtVerificationResult = {
    payload: JWTPayload;
};

const GUEST_COOKIE_NAME = "guest_token";

const GUEST_TTL_SECONDS = 7 * 24 * 60 * 60;

const encoder = new TextEncoder();

function getSupabaseJwtSecret(): Uint8Array | null {
    const secret = process.env.SUPABASE_JWT_SECRET;

    if (!secret) {
        return null;
    }

    return encoder.encode(secret);
}

function getGuestJwtSecret(): Uint8Array | null {
    const secret = process.env.GUEST_JWT_SECRET;

    if (!secret) {
        return null;
    }

    return encoder.encode(secret);
}

export function getSupabaseAccessTokenCookieName(): string {
    return process.env.SUPABASE_ACCESS_TOKEN_COOKIE_NAME || "sb-access-token";
}

async function verifyJwt(
    token: string,
    secret: Uint8Array
): Promise<JwtVerificationResult | null> {
    try {
        const result = await jwtVerify(token, secret);
        return { payload: result.payload };
    } catch {
        return null;
    }
}

/**
 * Parse session from a provided Supabase access token.
 * Used when the token is already available and we want to avoid
 * reading from cookies (e.g., immediately after setting a cookie
 * in the same request, which may not be readable yet in Next.js).
 */
export async function getSupabaseSessionFromToken(
    accessToken: string
): Promise<AppSession | null> {
    const secret = getSupabaseJwtSecret();

    if (!secret) {
        return null;
    }

    const result = await verifyJwt(accessToken, secret);

    if (!result?.payload?.sub || typeof result.payload.sub !== "string") {
        return null;
    }

    const emailClaim =
        (typeof result.payload.email === "string" && result.payload.email) ||
        (typeof result.payload.user_metadata === "object" &&
            result.payload.user_metadata !== null &&
            typeof (result.payload.user_metadata as { email?: unknown })
                .email === "string" &&
            (result.payload.user_metadata as { email?: string }).email) ||
        null;

    return {
        user: {
            id: result.payload.sub,
            type: "regular",
            email: emailClaim,
        },
    };
}

export async function getSupabaseSessionFromCookies(): Promise<AppSession | null> {
    const secret = getSupabaseJwtSecret();

    if (!secret) {
        return null;
    }

    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get(
        getSupabaseAccessTokenCookieName()
    );

    if (!accessTokenCookie?.value) {
        return null;
    }

    const result = await verifyJwt(accessTokenCookie.value, secret);

    if (!result?.payload?.sub || typeof result.payload.sub !== "string") {
        return null;
    }

    const emailClaim =
        (typeof result.payload.email === "string" && result.payload.email) ||
        (typeof result.payload.user_metadata === "object" &&
            result.payload.user_metadata !== null &&
            typeof (result.payload.user_metadata as { email?: unknown })
                .email === "string" &&
            (result.payload.user_metadata as { email?: string }).email) ||
        null;

    return {
        user: {
            id: result.payload.sub,
            type: "regular",
            email: emailClaim,
        },
    };
}

export async function getGuestSessionFromCookies(): Promise<AppSession | null> {
    const secret = getGuestJwtSecret();

    if (!secret) {
        return null;
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(GUEST_COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    const result = await verifyJwt(token, secret);

    if (!result?.payload?.sub || typeof result.payload.sub !== "string") {
        // Invalid token – treat as no session. We intentionally avoid mutating
        // cookies here because cookie writes are only allowed in Route
        // Handlers or Server Actions under Next.js cacheComponents.
        return null;
    }

    return {
        user: {
            id: result.payload.sub,
            type: "guest",
        },
    };
}

export async function createGuestSession(): Promise<AppSession | null> {
    const secret = getGuestJwtSecret();

    if (!secret) {
        return null;
    }

    const guestId = `guest:${generateUUID()}`;

    // Use absolute UNIX timestamps for JWT iat/exp so the token verifies
    // correctly and persists for the full TTL window.
    const issuedAtSeconds = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = issuedAtSeconds + GUEST_TTL_SECONDS;

    const token = await new SignJWT({
        sub: guestId,
        type: "guest",
        iat: issuedAtSeconds,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(issuedAtSeconds)
        .setExpirationTime(expiresAtSeconds)
        .sign(secret);

    const cookieStore = await cookies();

    cookieStore.set(GUEST_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProductionEnvironment,
        path: "/",
        maxAge: GUEST_TTL_SECONDS,
        sameSite: "lax",
    });

    return {
        user: {
            id: guestId,
            type: "guest",
        },
    };
}

export async function getAppSession(): Promise<AppSession | null> {
    // OPTIMIZATION: Check both session types in parallel
    const [supabaseSession, guestSession] = await Promise.all([
        getSupabaseSessionFromCookies(),
        getGuestSessionFromCookies(),
    ]);

    // Prefer authenticated session over guest
    if (supabaseSession) {
        return supabaseSession;
    }

    if (guestSession) {
        return guestSession;
    }

    return null;
}
