import type { Instrumentation } from "next"

const STARTUP_ENV_WARNINGS = [
	{
		key: "NEXT_PUBLIC_SUPABASE_URL",
		message:
			"[startup] NEXT_PUBLIC_SUPABASE_URL is not set — authentication will be unavailable.",
	},
	{
		key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
		message:
			"[startup] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set — authentication will be unavailable.",
	},
	{
		key: "GUEST_JWT_SECRET",
		message: "[startup] GUEST_JWT_SECRET is not set — guest sessions will be unavailable.",
	},
] as const

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

function getErrorDigest(error: unknown): string | undefined {
	if (!(error instanceof Error) || !("digest" in error)) {
		return undefined
	}

	const digest = (error as { digest?: unknown }).digest
	return typeof digest === "string" ? digest : undefined
}

async function registerOpenTelemetry() {
	if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
		return
	}

	try {
		const { registerOTel } = await import("@vercel/otel")
		registerOTel({ serviceName: "ai-assistant" })
	} catch {
		console.warn(
			"[instrumentation] Failed to initialize OpenTelemetry — @vercel/otel may not be installed.",
		)
	}
}

function warnMissingStartupEnv() {
	for (const { key, message } of STARTUP_ENV_WARNINGS) {
		if (!process.env[key]) {
			console.warn(message)
		}
	}
}

export async function register() {
	await registerOpenTelemetry()

	// ── Startup env var validation (warnings only, never crashes) ──
	// Intentionally outside NEXT_RUNTIME check — needed in edge runtime too (proxy.ts).
	warnMissingStartupEnv()
}

/**
 * Server-side request error hook.
 * Called by Next.js when a server error occurs during rendering, route handling,
 * server actions, or proxy requests. Logs structured error context for observability.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
	console.error("[request-error]", {
		message: getErrorMessage(error),
		digest: getErrorDigest(error),
		path: request.path,
		method: request.method,
		routerKind: context.routerKind,
		routePath: context.routePath,
		routeType: context.routeType,
	})
}
