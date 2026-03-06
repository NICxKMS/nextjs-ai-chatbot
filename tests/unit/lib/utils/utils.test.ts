import { afterEach, describe, expect, it, vi } from "vitest"

import { cn as cnFromRootUtils } from "@/lib/utils"
import { cn as cnFromUtilsDir } from "@/lib/utils/cn"
import { generateUUID } from "@/lib/utils/generate-uuid"
import { validateOrigin } from "@/lib/utils/validate-origin"

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clearValidationEnv() {
	vi.stubEnv("VERCEL_URL", "")
	vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
	vi.stubEnv("NODE_ENV", "test")
}

function createRequest(headers: HeadersInit, url = "https://app.example.com/api/chat") {
	return new Request(url, {
		method: "POST",
		headers,
	})
}

afterEach(() => {
	vi.unstubAllEnvs()
})

describe("cn", () => {
	it("re-exports the canonical implementation from lib/utils", () => {
		expect(cnFromRootUtils).toBe(cnFromUtilsDir)
	})

	it("merges conditional classes", () => {
		const result = cnFromUtilsDir("px-2", undefined, false, ["text-sm"], {
			"font-bold": true,
			italic: false,
		})

		expect(result).toBe("px-2 text-sm font-bold")
	})

	it("resolves conflicting Tailwind classes by keeping the last one", () => {
		const result = cnFromUtilsDir("bg-red-500 px-2", "bg-blue-500 px-4")

		expect(result).toBe("bg-blue-500 px-4")
	})

	it("returns an empty string when no classes are provided", () => {
		expect(cnFromUtilsDir()).toBe("")
	})
})

describe("generateUUID", () => {
	it("returns a valid UUID v4", () => {
		const uuid = generateUUID()

		expect(uuid).toMatch(UUID_V4_REGEX)
	})

	it("returns a unique value on consecutive calls", () => {
		const first = generateUUID()
		const second = generateUUID()

		expect(first).not.toBe(second)
	})
})

describe("validateOrigin", () => {
	it("allows requests from the same origin as the request URL", () => {
		clearValidationEnv()

		const request = createRequest({
			origin: "https://app.example.com",
		})

		expect(validateOrigin(request)).toBe(true)
	})

	it("rejects unknown origins", () => {
		clearValidationEnv()

		const request = createRequest({
			origin: "https://evil.example.com",
		})

		expect(validateOrigin(request)).toBe(false)
	})

	it("allows the configured Vercel URL origin", () => {
		clearValidationEnv()
		vi.stubEnv("VERCEL_URL", "preview.example.vercel.app")

		const request = createRequest({
			origin: "https://preview.example.vercel.app",
		})

		expect(validateOrigin(request)).toBe(true)
	})

	it("allows the configured NEXT_PUBLIC_APP_URL origin", () => {
		clearValidationEnv()
		vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://assistant.example.com")

		const request = createRequest(
			{
				origin: "https://assistant.example.com",
			},
			"https://internal.example.com/api/chat",
		)

		expect(validateOrigin(request)).toBe(true)
	})

	it("allows localhost origins in development mode", () => {
		clearValidationEnv()
		vi.stubEnv("NODE_ENV", "development")

		const localhostRequest = createRequest(
			{
				origin: "http://localhost:3000",
			},
			"https://production.example.com/api/chat",
		)

		const loopbackRequest = createRequest(
			{
				origin: "http://127.0.0.1:3000",
			},
			"https://production.example.com/api/chat",
		)

		expect(validateOrigin(localhostRequest)).toBe(true)
		expect(validateOrigin(loopbackRequest)).toBe(true)
	})

	it("falls back to referer when origin is missing", () => {
		clearValidationEnv()

		const request = createRequest({
			referer: "https://app.example.com/chat/123",
		})

		expect(validateOrigin(request)).toBe(true)
	})

	it("rejects invalid referer URLs", () => {
		clearValidationEnv()

		const request = createRequest({
			referer: "not-a-valid-url",
		})

		expect(validateOrigin(request)).toBe(false)
	})

	it("rejects requests with no origin and no referer", () => {
		clearValidationEnv()

		const request = createRequest({})

		expect(validateOrigin(request)).toBe(false)
	})

	it("prefers origin over referer when both are present", () => {
		clearValidationEnv()

		const request = createRequest({
			origin: "https://evil.example.com",
			referer: "https://app.example.com/chat/123",
		})

		expect(validateOrigin(request)).toBe(false)
	})
})
