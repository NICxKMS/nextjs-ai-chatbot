import "server-only"

import { jwtVerify, SignJWT } from "jose"
import {
	GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS,
	GUEST_TOKEN_TTL_SECONDS,
} from "@/lib/auth/constants"

// ── Secret resolution ──────────────────────────────────────────

/**
 * Lazily resolve and encode the GUEST_JWT_SECRET.
 * Returns null if the env var is missing.
 */
function getSecret(): Uint8Array | null {
	const raw = process.env.GUEST_JWT_SECRET
	if (!raw) return null
	return new TextEncoder().encode(raw)
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Create a signed JWT for a guest user.
 *
 * @param userId - The guest user ID (a valid UUID)
 * @returns Signed JWT string with 1-hour expiry
 * @throws If `GUEST_JWT_SECRET` is not configured
 */
export async function mintGuestToken(userId: string): Promise<string> {
	const secret = getSecret()
	if (!secret) {
		throw new Error("GUEST_JWT_SECRET is not configured")
	}

	const nowSeconds = Math.floor(Date.now() / 1000)

	return new SignJWT({ sub: userId, type: "guest" })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt(nowSeconds)
		.setExpirationTime(nowSeconds + GUEST_TOKEN_TTL_SECONDS)
		.sign(secret)
}

/**
 * Verify and decode a guest JWT.
 *
 * **Never throws.** Returns `null` for expired, invalid, or
 * malformed tokens, and when the secret is not configured.
 *
 * @param token - Raw JWT string from the `guest_token` cookie
 * @returns `{ userId }` on success, `null` on any failure
 */
export async function verifyGuestToken(token: string): Promise<{ userId: string } | null> {
	try {
		const secret = getSecret()
		if (!secret) return null

		const { payload } = await jwtVerify(token, secret)

		if (payload.type !== "guest" || typeof payload.sub !== "string") {
			return null
		}

		return { userId: payload.sub }
	} catch {
		return null
	}
}

/**
 * Rotate a guest token if it is near expiry.
 *
 * If the token has more than 30 minutes remaining, the same token
 * is returned unchanged. Otherwise a fresh token is minted with
 * the same `userId` and a new 1-hour expiry.
 *
 * **Never throws from the public API.** Returns the original token
 * on any verification or minting error.
 *
 * @param token - The current guest JWT
 * @returns A (possibly new) JWT string
 */
export async function rotateGuestToken(token: string): Promise<string> {
	try {
		const secret = getSecret()
		if (!secret) return token

		const { payload } = await jwtVerify(token, secret)

		if (payload.type !== "guest" || typeof payload.sub !== "string") {
			return token
		}

		// Check if rotation is needed
		if (typeof payload.exp === "number") {
			const nowSeconds = Math.floor(Date.now() / 1000)
			const timeRemaining = payload.exp - nowSeconds

			if (timeRemaining >= GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS) {
				return token // Still far from expiry — no rotation needed
			}
		}

		// Mint a fresh token with the same userId
		return await mintGuestToken(payload.sub)
	} catch {
		return token
	}
}
