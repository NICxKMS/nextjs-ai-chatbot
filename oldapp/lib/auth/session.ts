import "server-only";

import type { JWTPayload } from "jose";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import {
    GUEST_CACHE_TTL_SECONDS,
    GUEST_TOKEN_TTL_SECONDS,
    getSecureCookieOptions,
} from "@/lib/constants";
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

// Cookie TTL - how long the cookie persists (7 days, sliding window for UX)
const GUEST_COOKIE_TTL_SECONDS = GUEST_CACHE_TTL_SECONDS;

// JWT TTL - how long the token is valid (1 hour for security, Task 7.6)
const GUEST_JWT_TTL_SECONDS = GUEST_TOKEN_TTL_SECONDS;

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

type JwtVerifyOptions = {
    audience?: string | string[];
    issuer?: string | string[];
};

async function verifyJwt(
    token: string,
    secret: Uint8Array,
    options?: JwtVerifyOptions
): Promise<JwtVerificationResult | null> {
    try {
        const result = await jwtVerify(token, secret, {
            audience: options?.audience,
            issuer: options?.issuer,
        });
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
// Get Supabase URL for JWT issuer validation
function getSupabaseIssuer(): string | undefined {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
        return;
    }
    // Supabase issues JWTs from the auth endpoint
    return `${supabaseUrl}/auth/v1`;
}

export async function getSupabaseSessionFromToken(
    accessToken: string
): Promise<AppSession | null> {
    const secret = getSupabaseJwtSecret();

    if (!secret) {
        return null;
    }

    // Validate JWT with audience (authenticated role) and issuer (Supabase auth)
    const result = await verifyJwt(accessToken, secret, {
        audience: "authenticated",
        issuer: getSupabaseIssuer(),
    });

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

    // Validate JWT with audience (authenticated role) and issuer (Supabase auth)
    const result = await verifyJwt(accessTokenCookie.value, secret, {
        audience: "authenticated",
        issuer: getSupabaseIssuer(),
    });

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

    // Task 7.6: Token Rotation - Use shorter JWT TTL (1 hour) for security
    // while maintaining longer cookie TTL (7 days) for UX
    const issuedAtSeconds = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = issuedAtSeconds + GUEST_JWT_TTL_SECONDS;

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

    // Cookie TTL is longer than JWT TTL - middleware will rotate the token
    cookieStore.set(
        GUEST_COOKIE_NAME,
        token,
        getSecureCookieOptions(GUEST_COOKIE_TTL_SECONDS)
    );

    return {
        user: {
            id: guestId,
            type: "guest",
        },
    };
}

export async function getAppSession(): Promise<AppSession | null> {
    // Task 7.9: Sequential session check with early return
    // Check authenticated session first - if found, skip guest check entirely
    // This optimizes for the common case of authenticated users
    const supabaseSession = await getSupabaseSessionFromCookies();
    if (supabaseSession) {
        return supabaseSession;
    }

    // Only check guest session if no authenticated session found
    const guestSession = await getGuestSessionFromCookies();
    if (guestSession) {
        return guestSession;
    }

    return null;
}
