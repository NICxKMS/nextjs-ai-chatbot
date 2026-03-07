import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import { config, proxy } from "@/proxy"

const SUPABASE_AUTH_COOKIE_NAME = "sb-localhost-auth-token"

const mockMintGuestToken = vi.fn()
const mockRotateGuestToken = vi.fn()
const mockVerifyGuestToken = vi.fn()

vi.mock("@/lib/auth/guest", () => ({
	mintGuestToken: (...args: unknown[]) => mockMintGuestToken(...args),
	rotateGuestToken: (...args: unknown[]) => mockRotateGuestToken(...args),
	verifyGuestToken: (...args: unknown[]) => mockVerifyGuestToken(...args),
}))

function createRequest(pathname: string, cookieHeader?: string) {
	const headers = new Headers()

	if (cookieHeader) {
		headers.set("cookie", cookieHeader)
	}

	return new NextRequest(`http://localhost${pathname}`, { headers })
}

beforeEach(() => {
	vi.clearAllMocks()
	mockMintGuestToken.mockResolvedValue("fresh-guest-token")
	mockRotateGuestToken.mockImplementation(async (token: string) => token)
	mockVerifyGuestToken.mockResolvedValue({ userId: "guest-user-id" })
	vi.spyOn(crypto, "randomUUID").mockReturnValue("guest-user-id")
})

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

describe("proxy", () => {
	it("redirects auth-required routes when the guest token is invalid", async () => {
		mockVerifyGuestToken.mockResolvedValue(null)

		const response = await proxy(
			createRequest("/settings", `${GUEST_COOKIE_NAME}=invalid-token`),
		)

		expect(mockVerifyGuestToken).toHaveBeenCalledWith("invalid-token")
		expect(response.status).toBe(307)
		expect(response.headers.get("location")).toBe("http://localhost/login")
	})

	it("allows auth-required routes when the guest token is valid", async () => {
		const response = await proxy(createRequest("/settings", `${GUEST_COOKIE_NAME}=valid-token`))

		expect(mockVerifyGuestToken).toHaveBeenCalledWith("valid-token")
		expect(response.status).toBe(200)
		expect(response.headers.get("location")).toBeNull()
	})

	it("allows auth-required routes when an exact Supabase auth cookie is present", async () => {
		const response = await proxy(
			createRequest("/settings", `${SUPABASE_AUTH_COOKIE_NAME}=session`),
		)

		expect(mockVerifyGuestToken).not.toHaveBeenCalled()
		expect(response.status).toBe(200)
		expect(response.headers.get("location")).toBeNull()
	})

	it("allows auth-required routes when a chunked Supabase auth cookie is present", async () => {
		const response = await proxy(
			createRequest("/settings", `${SUPABASE_AUTH_COOKIE_NAME}.0=session-part`),
		)

		expect(mockVerifyGuestToken).not.toHaveBeenCalled()
		expect(response.status).toBe(200)
		expect(response.headers.get("location")).toBeNull()
	})

	it("does not treat non-session Supabase cookies as authenticated", async () => {
		mockVerifyGuestToken.mockResolvedValue(null)

		const response = await proxy(
			createRequest("/settings", "sb-localhost-code-verifier=pkce-token"),
		)

		expect(response.status).toBe(307)
		expect(response.headers.get("location")).toBe("http://localhost/login")
	})

	it("replaces an invalid guest token on guest-eligible routes", async () => {
		mockVerifyGuestToken.mockResolvedValue(null)

		const response = await proxy(createRequest("/", `${GUEST_COOKIE_NAME}=stale-token`))

		expect(mockVerifyGuestToken).toHaveBeenCalledWith("stale-token")
		expect(mockMintGuestToken).toHaveBeenCalledWith("guest-user-id")
		expect(response.status).toBe(200)
		expect(response.cookies.get(GUEST_COOKIE_NAME)?.value).toBe("fresh-guest-token")
	})

	it("rotates a valid guest token when a refreshed token is returned", async () => {
		mockRotateGuestToken.mockResolvedValue("rotated-token")

		const response = await proxy(createRequest("/", `${GUEST_COOKIE_NAME}=expiring-token`))

		expect(mockVerifyGuestToken).toHaveBeenCalledWith("expiring-token")
		expect(mockRotateGuestToken).toHaveBeenCalledWith("expiring-token")
		expect(response.status).toBe(200)
		expect(response.cookies.get(GUEST_COOKIE_NAME)?.value).toBe("rotated-token")
	})

	it("limits the runtime matcher to current chat and auth entry points", () => {
		expect(config.matcher).toEqual(["/", "/chat/:path*", "/login", "/register", "/api/chat"])
	})
})
