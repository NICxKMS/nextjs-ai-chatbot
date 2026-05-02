import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import { proxy } from "@/proxy"

const mocks = vi.hoisted(() => ({
	mintGuestToken: vi.fn(),
	rotateGuestToken: vi.fn(),
	verifyGuestToken: vi.fn(),
	loggerError: vi.fn(),
}))

vi.mock("@/lib/auth/guest", () => ({
	mintGuestToken: mocks.mintGuestToken,
	rotateGuestToken: mocks.rotateGuestToken,
	verifyGuestToken: mocks.verifyGuestToken,
}))
vi.mock("@/lib/utils/logger", () => ({ logger: { error: mocks.loggerError } }))

function proxyRequest(pathname: string, init?: { headers?: HeadersInit }) {
	return new NextRequest(`https://app.example.com${pathname}`, init)
}

function forwardedHeader(response: Response, name: string) {
	return response.headers.get(`x-middleware-request-${name}`)
}

function forwardedCookie(response: Response) {
	return forwardedHeader(response, "cookie")
}

describe("auth proxy integration flow", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project-ref.supabase.co")
		mocks.mintGuestToken.mockResolvedValue("minted-token")
		mocks.rotateGuestToken.mockImplementation(async (token: string) => token)
		mocks.verifyGuestToken.mockResolvedValue({ sub: "guest-user" })
	})

	it("mints guest tokens for sessionless guest-eligible pages", async () => {
		const response = await proxy(proxyRequest("/"))

		expect(mocks.mintGuestToken).toHaveBeenCalledTimes(1)
		expect(response.cookies.get(GUEST_COOKIE_NAME)?.value).toBe("minted-token")
		expect(forwardedHeader(response, "x-session-type")).toBe("guest")
		expect(forwardedCookie(response)).toContain(`${GUEST_COOKIE_NAME}=minted-token`)
	})

	it("rotates verified guest tokens when rotation returns a replacement", async () => {
		mocks.rotateGuestToken.mockResolvedValue("rotated-token")

		const response = await proxy(
			proxyRequest("/api/chat", { headers: { cookie: `${GUEST_COOKIE_NAME}=old-token` } }),
		)

		expect(mocks.verifyGuestToken).toHaveBeenCalledWith("old-token")
		expect(mocks.rotateGuestToken).toHaveBeenCalledWith("old-token", { sub: "guest-user" })
		expect(response.cookies.get(GUEST_COOKIE_NAME)?.value).toBe("rotated-token")
		expect(forwardedCookie(response)).toContain(`${GUEST_COOKIE_NAME}=rotated-token`)
	})

	it("replaces invalid guest tokens with a newly minted token", async () => {
		mocks.verifyGuestToken.mockResolvedValue(null)

		const response = await proxy(
			proxyRequest("/chat/example", {
				headers: { cookie: `${GUEST_COOKIE_NAME}=bad-token` },
			}),
		)

		expect(mocks.mintGuestToken).toHaveBeenCalledTimes(1)
		expect(response.cookies.get(GUEST_COOKIE_NAME)?.value).toBe("minted-token")
		expect(forwardedHeader(response, "x-session-type")).toBe("guest")
	})

	it("forwards public auth pages as sessionless when no Supabase auth cookie exists", async () => {
		const response = await proxy(proxyRequest("/login"))

		expect(mocks.mintGuestToken).not.toHaveBeenCalled()
		expect(forwardedHeader(response, "x-session-type")).toBe("none")
	})

	it("fast-paths public health checks without guest token lifecycle work", async () => {
		const response = await proxy(proxyRequest("/api/health"))

		expect(response.status).toBe(200)
		expect(mocks.mintGuestToken).not.toHaveBeenCalled()
		expect(mocks.verifyGuestToken).not.toHaveBeenCalled()
		expect(mocks.rotateGuestToken).not.toHaveBeenCalled()
		expect(forwardedHeader(response, "x-session-type")).toBeNull()
		expect(response.cookies.get(GUEST_COOKIE_NAME)).toBeUndefined()
	})

	it("redirects protected pages without a valid session", async () => {
		const response = await proxy(proxyRequest("/settings"))

		expect(response.status).toBe(307)
		expect(response.headers.get("location")).toBe("https://app.example.com/login")
	})

	it("forwards protected API routes without redirect while marking no session", async () => {
		const response = await proxy(proxyRequest("/api/private"))

		expect(response.status).toBe(200)
		expect(forwardedHeader(response, "x-session-type")).toBe("none")
	})

	it("adds the device header and strips spoofed session headers", async () => {
		const response = await proxy(
			proxyRequest("/", {
				headers: {
					"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
					"x-session-type": "authenticated",
				},
			}),
		)

		expect(forwardedHeader(response, "x-device-type")).toBe("mobile")
		expect(forwardedHeader(response, "x-session-type")).toBe("guest")
	})

	it("logs guest token lifecycle failures and forwards without setting a guest cookie", async () => {
		const error = new Error("guest secret missing")
		mocks.verifyGuestToken.mockRejectedValue(error)

		const response = await proxy(
			proxyRequest("/api/chat", {
				headers: { cookie: `${GUEST_COOKIE_NAME}=old-token` },
			}),
		)

		expect(mocks.verifyGuestToken).toHaveBeenCalledWith("old-token")
		expect(mocks.rotateGuestToken).not.toHaveBeenCalled()
		expect(mocks.loggerError).toHaveBeenCalledWith("[proxy] Guest token lifecycle error", {
			error: String(error),
		})
		expect(forwardedHeader(response, "x-session-type")).toBe("none")
		expect(response.cookies.get(GUEST_COOKIE_NAME)).toBeUndefined()
	})
})
