import { afterEach, describe, expect, it, vi } from "vitest"

const startupEnv = {
	GUEST_JWT_SECRET: "test-guest-secret",
	NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
	NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
} as const

function stubStartupEnv() {
	for (const [key, value] of Object.entries(startupEnv)) {
		vi.stubEnv(key, value)
	}
}

afterEach(() => {
	vi.resetModules()
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
})

describe("server instrumentation", () => {
	it("does not initialize OpenTelemetry outside the Node.js runtime", async () => {
		const registerOTel = vi.fn()
		vi.doMock("@vercel/otel", () => ({ registerOTel }))
		vi.stubEnv("NEXT_RUNTIME", "edge")
		vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel.test")
		stubStartupEnv()

		const { register } = await import("../../instrumentation")

		await register()

		expect(registerOTel).not.toHaveBeenCalled()
	})

	it("does not initialize OpenTelemetry without an OTLP endpoint", async () => {
		const registerOTel = vi.fn()
		vi.doMock("@vercel/otel", () => ({ registerOTel }))
		vi.stubEnv("NEXT_RUNTIME", "nodejs")
		vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
		stubStartupEnv()

		const { register } = await import("../../instrumentation")

		await register()

		expect(registerOTel).not.toHaveBeenCalled()
	})

	it("initializes OpenTelemetry for Node.js when an OTLP endpoint is configured", async () => {
		const registerOTel = vi.fn()
		vi.doMock("@vercel/otel", () => ({ registerOTel }))
		vi.stubEnv("NEXT_RUNTIME", "nodejs")
		vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel.test")
		stubStartupEnv()

		const { register } = await import("../../instrumentation")

		await register()

		expect(registerOTel).toHaveBeenCalledWith({ serviceName: "ai-assistant" })
	})

	it("keeps startup safe when OpenTelemetry cannot be imported", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
		vi.doMock("@vercel/otel", () => {
			throw new Error("missing otel")
		})
		vi.stubEnv("NEXT_RUNTIME", "nodejs")
		vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel.test")
		stubStartupEnv()

		const { register } = await import("../../instrumentation")

		await expect(register()).resolves.toBeUndefined()
		expect(warn).toHaveBeenCalledWith(
			"[instrumentation] Failed to initialize OpenTelemetry — @vercel/otel may not be installed.",
		)
	})

	it("logs structured request error context through the Next.js hook signature", async () => {
		const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined)
		const { onRequestError } = await import("../../instrumentation")
		type OnRequestErrorArgs = Parameters<typeof onRequestError>
		const error = Object.assign(new Error("render failed"), { digest: "digest-1" })
		const request: OnRequestErrorArgs[1] = {
			headers: { accept: "text/html" },
			method: "GET",
			path: "/chat/123",
		}
		const context: OnRequestErrorArgs[2] = {
			renderSource: "server-rendering",
			revalidateReason: undefined,
			routePath: "/app/chat/[id]/page",
			routeType: "render",
			routerKind: "App Router",
		}

		await onRequestError(error, request, context)

		expect(errorLog).toHaveBeenCalledWith("[request-error]", {
			digest: "digest-1",
			message: "render failed",
			method: "GET",
			path: "/chat/123",
			routePath: "/app/chat/[id]/page",
			routeType: "render",
			routerKind: "App Router",
		})
	})
})
