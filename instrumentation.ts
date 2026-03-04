import type { Instrumentation } from "next"

export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		// ── OpenTelemetry (conditional on OTLP endpoint) ──
		// Only initialize when an exporter endpoint is configured.
		// Uses dynamic import so the app runs cleanly even if @vercel/otel
		// is not installed (e.g. in local dev without tracing).
		if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
			try {
				const { registerOTel } = await import("@vercel/otel")
				registerOTel({ serviceName: "ai-assistant" })
			} catch {
				console.warn(
					"[instrumentation] Failed to initialize OpenTelemetry — @vercel/otel may not be installed.",
				)
			}
		}
	}

	// ── Startup env var validation (warnings only, never crashes) ──
	// Intentionally outside NEXT_RUNTIME check — needed in edge runtime too (proxy.ts).
	if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
		console.warn(
			"[startup] NEXT_PUBLIC_SUPABASE_URL is not set — authentication will be unavailable.",
		)
	}
	if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
		console.warn(
			"[startup] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set — authentication will be unavailable.",
		)
	}
	if (!process.env.GUEST_JWT_SECRET) {
		console.warn("[startup] GUEST_JWT_SECRET is not set — guest sessions will be unavailable.")
	}
}

/**
 * Server-side request error hook.
 * Called by Next.js when a server error occurs during rendering, route handling,
 * server actions, or proxy requests. Logs structured error context for observability.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
	const isError = error instanceof Error
	const digest = isError && "digest" in error ? (error as { digest: string }).digest : undefined

	console.error("[request-error]", {
		message: isError ? error.message : String(error),
		digest,
		path: request.path,
		method: request.method,
		routerKind: context.routerKind,
		routePath: context.routePath,
		routeType: context.routeType,
	})
}
