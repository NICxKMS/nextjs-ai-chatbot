// Flow: auth-session | Step: auth-constants
import { describe, expect, it } from "vitest"

import {
	GUEST_COOKIE_NAME,
	GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS,
	GUEST_TOKEN_TTL_SECONDS,
} from "@/lib/auth/constants"

describe("lib/auth/constants", () => {
	describe("GUEST_COOKIE_NAME", () => {
		it("is a non-empty string", () => {
			expect(typeof GUEST_COOKIE_NAME).toBe("string")
			expect(GUEST_COOKIE_NAME.length).toBeGreaterThan(0)
		})

		it('equals "guest_token"', () => {
			expect(GUEST_COOKIE_NAME).toBe("guest_token")
		})
	})

	describe("GUEST_TOKEN_TTL_SECONDS", () => {
		it("is a positive number", () => {
			expect(typeof GUEST_TOKEN_TTL_SECONDS).toBe("number")
			expect(GUEST_TOKEN_TTL_SECONDS).toBeGreaterThan(0)
		})

		it("equals 3600 (1 hour)", () => {
			expect(GUEST_TOKEN_TTL_SECONDS).toBe(3600)
		})
	})

	describe("GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS", () => {
		it("is a positive number", () => {
			expect(typeof GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS).toBe("number")
			expect(GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS).toBeGreaterThan(0)
		})

		it("equals 1800 (30 minutes)", () => {
			expect(GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS).toBe(1800)
		})
	})

	describe("invariants", () => {
		it("TTL is strictly greater than rotation threshold", () => {
			expect(GUEST_TOKEN_TTL_SECONDS).toBeGreaterThan(GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS)
		})
	})
})
