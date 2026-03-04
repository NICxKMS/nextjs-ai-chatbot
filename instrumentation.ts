export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		// OpenTelemetry setup deferred to P7
		// await import("@vercel/otel")
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
