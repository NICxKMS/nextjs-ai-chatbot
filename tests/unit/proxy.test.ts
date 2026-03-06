import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import { proxy } from "@/proxy"

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
})
