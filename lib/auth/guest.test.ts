// Flow: auth-session | Step: guest-token-management
import { jwtVerify, SignJWT } from "jose"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { mintGuestToken, rotateGuestToken, verifyGuestToken } from "@/lib/auth/guest"

const TEST_SECRET = "test-jwt-secret-that-is-at-least-32-chars!"
const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"

describe("lib/auth/guest", () => {
	beforeEach(() => {
		process.env.GUEST_JWT_SECRET = TEST_SECRET
	})

	afterEach(() => {
		delete process.env.GUEST_JWT_SECRET
	})

	// ── mintGuestToken ─────────────────────────────────────────

	describe("mintGuestToken", () => {
		it("returns a valid JWT string with three segments", async () => {
			const token = await mintGuestToken(TEST_USER_ID)

			expect(typeof token).toBe("string")
			expect(token.split(".")).toHaveLength(3)
		})

		it("produces a token verifiable with the configured secret", async () => {
			const token = await mintGuestToken(TEST_USER_ID)
			const secret = new TextEncoder().encode(TEST_SECRET)

			const { payload } = await jwtVerify(token, secret)

			expect(payload.sub).toBe(TEST_USER_ID)
			expect(payload.type).toBe("guest")
			expect(typeof payload.iat).toBe("number")
			expect(typeof payload.exp).toBe("number")
		})

		it("sets expiry to TTL seconds from issuance", async () => {
			const token = await mintGuestToken(TEST_USER_ID)
			const secret = new TextEncoder().encode(TEST_SECRET)

			const { payload } = await jwtVerify(token, secret)

			// exp - iat should equal TTL (3600 seconds)
			const exp = payload.exp ?? 0
			const iat = payload.iat ?? 0
			expect(exp - iat).toBe(3600)
		})

		it("throws when GUEST_JWT_SECRET is not configured", async () => {
			delete process.env.GUEST_JWT_SECRET

			await expect(mintGuestToken(TEST_USER_ID)).rejects.toThrow(
				"GUEST_JWT_SECRET is not configured",
			)
		})
	})

	// ── verifyGuestToken ───────────────────────────────────────

	describe("verifyGuestToken", () => {
		it("returns payload with userId and exp for a valid token", async () => {
			const token = await mintGuestToken(TEST_USER_ID)
			const result = await verifyGuestToken(token)

			expect(result).not.toBeNull()
			expect(result?.userId).toBe(TEST_USER_ID)
			expect(typeof result?.exp).toBe("number")
			expect(result?.exp).toBeGreaterThan(0)
		})

		it("returns null for an expired token", async () => {
			const secret = new TextEncoder().encode(TEST_SECRET)
			const now = Math.floor(Date.now() / 1000)

			const expiredToken = await new SignJWT({ sub: TEST_USER_ID, type: "guest" })
				.setProtectedHeader({ alg: "HS256" })
				.setIssuedAt(now - 7200)
				.setExpirationTime(now - 3600)
				.sign(secret)

			const result = await verifyGuestToken(expiredToken)
			expect(result).toBeNull()
		})

		it("returns null for an invalid/malformed token", async () => {
			const result = await verifyGuestToken("not.a.valid.jwt")
			expect(result).toBeNull()
		})

		it('returns null for a token with wrong type claim (not "guest")', async () => {
			const secret = new TextEncoder().encode(TEST_SECRET)
			const now = Math.floor(Date.now() / 1000)

			const wrongTypeToken = await new SignJWT({ sub: TEST_USER_ID, type: "admin" })
				.setProtectedHeader({ alg: "HS256" })
				.setIssuedAt(now)
				.setExpirationTime(now + 3600)
				.sign(secret)

			const result = await verifyGuestToken(wrongTypeToken)
			expect(result).toBeNull()
		})

		it("returns null for a token with missing sub claim", async () => {
			const secret = new TextEncoder().encode(TEST_SECRET)
			const now = Math.floor(Date.now() / 1000)

			const noSubToken = await new SignJWT({ type: "guest" })
				.setProtectedHeader({ alg: "HS256" })
				.setIssuedAt(now)
				.setExpirationTime(now + 3600)
				.sign(secret)

			const result = await verifyGuestToken(noSubToken)
			expect(result).toBeNull()
		})

		it("returns null when GUEST_JWT_SECRET is not configured", async () => {
			// Mint with valid secret first
			const token = await mintGuestToken(TEST_USER_ID)

			// Remove secret before verification
			delete process.env.GUEST_JWT_SECRET

			const result = await verifyGuestToken(token)
			expect(result).toBeNull()
		})
	})

	// ── rotateGuestToken ───────────────────────────────────────

	describe("rotateGuestToken", () => {
		it("does not rotate a freshly minted token", async () => {
			const token = await mintGuestToken(TEST_USER_ID)
			const result = await rotateGuestToken(token)

			expect(result).toBe(token)
		})

		it("rotates a token close to expiry", async () => {
			const secret = new TextEncoder().encode(TEST_SECRET)
			const now = Math.floor(Date.now() / 1000)

			// Token expires in 5 minutes (300s), which is < rotation threshold (1800s)
			const nearExpiryToken = await new SignJWT({
				sub: TEST_USER_ID,
				type: "guest",
			})
				.setProtectedHeader({ alg: "HS256" })
				.setIssuedAt(now - 3300)
				.setExpirationTime(now + 300)
				.sign(secret)

			const result = await rotateGuestToken(nearExpiryToken)

			expect(result).not.toBe(nearExpiryToken)
			// The new token should be valid
			const { payload } = await jwtVerify(result, secret)
			expect(payload.sub).toBe(TEST_USER_ID)
		})

		it("uses pre-verified payload and skips JWT verification", async () => {
			const now = Math.floor(Date.now() / 1000)
			const preVerified = { userId: TEST_USER_ID, exp: now + 100 } // near expiry

			// Token string is irrelevant — pre-verified payload is used directly
			const result = await rotateGuestToken("opaque-token-not-verified", preVerified)

			expect(result).not.toBe("opaque-token-not-verified")
			// Result should be a real JWT minted with the user ID
			const secret = new TextEncoder().encode(TEST_SECRET)
			const { payload } = await jwtVerify(result, secret)
			expect(payload.sub).toBe(TEST_USER_ID)
		})

		it("does not rotate when pre-verified payload shows token is fresh", async () => {
			const now = Math.floor(Date.now() / 1000)
			// 45 minutes remaining (> 30 min threshold)
			const preVerified = { userId: TEST_USER_ID, exp: now + 2700 }

			const result = await rotateGuestToken("some-valid-token", preVerified)

			expect(result).toBe("some-valid-token")
		})

		it("returns original token when verification fails (invalid JWT)", async () => {
			const invalidToken = "completely-invalid-token"
			const result = await rotateGuestToken(invalidToken)

			expect(result).toBe(invalidToken)
		})

		it("returns original token when GUEST_JWT_SECRET is not configured", async () => {
			delete process.env.GUEST_JWT_SECRET

			const result = await rotateGuestToken("some-token")
			expect(result).toBe("some-token")
		})
	})
})
