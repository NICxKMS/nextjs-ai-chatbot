/**
 * JWT Utilities
 * Ref: 02-authentication-optimal-design.md §5
 *
 * Uses jose for Edge-compatible JWT operations
 */

import * as jose from "jose";
import { JWT_EXPIRATION_SECONDS, JWT_ISSUER } from "./constants";
import type { DeviceFingerprint, GuestTokenPayload, JWTPayload } from "./types";

// ============== DEVICE FINGERPRINT ==============

/**
 * Generate a truncated SHA-256 hash (Edge-compatible)
 * Uses Web Crypto API which works in Edge runtime
 */
async function sha256Truncated(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    // Return first 16 characters for compact storage
    return hashHex.slice(0, 16);
}

/**
 * Create device fingerprint from IP and User-Agent
 * Normalizes inputs before hashing for consistency
 */
export async function createDeviceFingerprint(
    ip: string | null,
    userAgent: string | null
): Promise<DeviceFingerprint> {
    // Normalize IP: extract first IP if comma-separated, trim
    const normalizedIp = ip?.split(",")[0]?.trim() || "unknown";

    // Normalize User-Agent: lowercase, trim
    const normalizedUa = userAgent?.toLowerCase().trim() || "unknown";

    const [ipHash, uaHash] = await Promise.all([
        sha256Truncated(normalizedIp),
        sha256Truncated(normalizedUa),
    ]);

    return { ipHash, uaHash };
}

/**
 * Validate device fingerprint against stored fingerprint
 *
 * Security policy:
 * - User-Agent MUST match exactly (prevents session theft across browsers)
 * - IP changes trigger re-validation flag but don't block immediately
 *   (users change networks legitimately)
 *
 * @returns { valid: boolean, ipChanged: boolean }
 */
export async function validateDeviceFingerprint(
    stored: DeviceFingerprint | undefined,
    currentIp: string | null,
    currentUserAgent: string | null
): Promise<{ valid: boolean; ipChanged: boolean }> {
    // No fingerprint stored = legacy token, allow but flag for rotation
    if (!stored) {
        return { valid: true, ipChanged: false };
    }

    const current = await createDeviceFingerprint(currentIp, currentUserAgent);

    // User-Agent must match (strict validation)
    if (stored.uaHash !== current.uaHash) {
        return { valid: false, ipChanged: false };
    }

    // IP can change (network mobility), but flag it
    const ipChanged = stored.ipHash !== current.ipHash;

    return { valid: true, ipChanged };
}

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
 * Create a guest token with optional device fingerprint
 *
 * @param guestId - Unique guest identifier
 * @param fingerprint - Optional device fingerprint for binding
 */
export async function createGuestToken(
    guestId: string,
    fingerprint?: DeviceFingerprint
): Promise<string> {
    const payload: Omit<GuestTokenPayload, "iat" | "exp"> = {
        sub: `guest:${guestId}`,
        type: "guest",
        ...(fingerprint && { fp: fingerprint }),
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
    if (!payload.exp) {
        return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = payload.exp - now;

    // Rotate if less than 30 minutes remaining
    return timeRemaining < 1800;
}
