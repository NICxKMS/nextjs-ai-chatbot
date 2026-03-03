export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		// OpenTelemetry setup deferred to P7
		// await import("@vercel/otel")
	}
}
