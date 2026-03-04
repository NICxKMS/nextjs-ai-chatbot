// ── Client-side instrumentation ──
// Runs before React hydration. Keep lightweight — no heavy imports.

/**
 * Global error handler for uncaught client-side errors.
 * Logs a structured payload to the console. In production, this could be
 * extended to report to an external error-tracking service.
 */
if (typeof window !== "undefined") {
	window.addEventListener("error", (event) => {
		console.error("[client-error]", {
			message: event.message,
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno,
		})
	})

	window.addEventListener("unhandledrejection", (event) => {
		console.error("[client-unhandled-rejection]", {
			reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
		})
	})
}
