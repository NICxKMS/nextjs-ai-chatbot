import type { JWTPayload } from "jose";
import { jwtVerify, SignJWT } from "jose";
import { type NextRequest, NextResponse } from "next/server";

const GUEST_COOKIE_NAME = "guest_token";
const GUEST_TTL_SECONDS = 7 * 24 * 60 * 60;

// Pre-encode secret once at module load for performance
const GUEST_JWT_SECRET = process.env.GUEST_JWT_SECRET
    ? new TextEncoder().encode(process.env.GUEST_JWT_SECRET)
    : null;

// Routes that don't need guest session creation
const SKIP_GUEST_SESSION_PATHS = new Set(["/api/", "/login", "/register"]);

function shouldSkipGuestSession(pathname: string): boolean {
    if (pathname.startsWith("/api/")) {
        return true;
    }
    return SKIP_GUEST_SESSION_PATHS.has(pathname);
}

async function verifyGuestToken(
    token: string,
    secret: Uint8Array
): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        if (payload.type === "guest" && typeof payload.sub === "string") {
            return payload;
        }
        return null;
    } catch {
        return null;
    }
}

function createGuestToken(secret: Uint8Array): Promise<string> {
    const guestId = `guest:${crypto.randomUUID()}`;
    const issuedAtSeconds = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = issuedAtSeconds + GUEST_TTL_SECONDS;

    return new SignJWT({
        sub: guestId,
        type: "guest",
        iat: issuedAtSeconds,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(issuedAtSeconds)
        .setExpirationTime(expiresAtSeconds)
        .sign(secret);
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Fast path: Playwright health check
    if (pathname === "/ping") {
        return new Response("pong", { status: 200 });
    }

    const response = NextResponse.next();

    // Skip guest session for API routes and auth pages
    if (shouldSkipGuestSession(pathname)) {
        return response;
    }

    // Guest auth not configured - skip session creation
    if (!GUEST_JWT_SECRET) {
        return response;
    }

    // Fast path: Check if guest token cookie exists first (single O(1) lookup)
    const guestToken = request.cookies.get(GUEST_COOKIE_NAME)?.value;
    if (guestToken) {
        // Verify the token is still valid (not expired/tampered)
        const payload = await verifyGuestToken(guestToken, GUEST_JWT_SECRET);
        if (payload) {
            return response;
        }
        // Token invalid/expired - fall through to create new one
    }

    // Check for Supabase session (authenticated user) - only if no guest token
    // This avoids iterating cookies for returning guest users
    const hasSupabaseSession = request.cookies
        .getAll()
        .some((cookie) => cookie.name.startsWith("sb-"));

    if (hasSupabaseSession) {
        return response;
    }

    // No valid session - create guest session
    const token = await createGuestToken(GUEST_JWT_SECRET);
    const isProduction = process.env.NODE_ENV === "production";

    response.cookies.set(GUEST_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        path: "/",
        maxAge: GUEST_TTL_SECONDS,
        sameSite: "lax",
    });

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all paths except static assets and metadata files.
         * Guest session logic inside proxy() handles further filtering.
         */
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
