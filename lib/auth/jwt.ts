/**
 * JWT Utilities
 * Ref: 02-authentication-optimal-design.md §5
 *
 * Uses jose for Edge-compatible JWT operations
 */

import * as jose from "jose";
import type { GuestTokenPayload, JWTPayload } from "./types";
import { JWT_EXPIRATION_SECONDS, JWT_ISSUER } from "./constants";

/**
 * Get the JWT secret from environment
 */
function getSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error("AUTH_SECRET environment variable is not set");
    }
    return new TextEncoder().encode(secret);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJwt<T extends JWTPayload>(
    token: string
): Promise<T | null> {
    try {
        const { payload } = await jose.jwtVerify(token, getSecret(), {
            issuer: JWT_ISSUER,
        });
        return payload as T;
    } catch {
        return null;
    }
}

/**
 * Sign a JWT token
 */
export async function signJwt(
    payload: Record<string, unknown>,
    expiresIn: number = JWT_EXPIRATION_SECONDS
): Promise<string> {
    const secret = getSecret();

    return new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setExpirationTime(`${expiresIn}s`)
        .sign(secret);
}

/**
 * Create a guest token
 */
export async function createGuestToken(guestId: string): Promise<string> {
    const payload: Omit<GuestTokenPayload, "iat" | "exp"> = {
        sub: `guest:${guestId}`,
        type: "guest",
    };

    return signJwt(payload, JWT_EXPIRATION_SECONDS);
}

/**
 * Verify a guest token
 */
export async function verifyGuestToken(
    token: string
): Promise<GuestTokenPayload | null> {
    const payload = await verifyJwt<GuestTokenPayload>(token);

    if (!payload || payload.type !== "guest") {
        return null;
    }

    return payload;
}

/**
 * Check if a token needs rotation (< 30 min remaining)
 */
export function needsRotation(payload: GuestTokenPayload): boolean {
    if (!payload.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = payload.exp - now;

    // Rotate if less than 30 minutes remaining
    return timeRemaining < 1800;
}
