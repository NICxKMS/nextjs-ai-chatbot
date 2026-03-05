import "server-only"

/**
 * Validate Origin/Referer headers against allowed origins for CSRF protection.
 *
 * Next.js Server Actions have built-in CSRF protection, but Route Handlers
 * (app/api/) do NOT. This utility must be applied to all POST route handlers.
 *
 * Adapted from the old app's `lib/api/utils.ts`.
 */
export function validateOrigin(request: Request): boolean {
	const origin = request.headers.get("origin")
	const referer = request.headers.get("referer")
	const requestUrl = new URL(request.url)

	// Build list of allowed origins
	const allowedOrigins = new Set<string>()

	// Always allow the request's own origin (handles localhost and production)
	allowedOrigins.add(requestUrl.origin)

	// Allow configured Vercel URL
	if (process.env.VERCEL_URL) {
		allowedOrigins.add(`https://${process.env.VERCEL_URL}`)
	}

	// Allow configured app URL
	if (process.env.NEXT_PUBLIC_APP_URL) {
		allowedOrigins.add(process.env.NEXT_PUBLIC_APP_URL)
	}

	// Development: also allow localhost variations
	if (process.env.NODE_ENV === "development") {
		allowedOrigins.add("http://localhost:3000")
		allowedOrigins.add("http://127.0.0.1:3000")
	}

	// Check Origin header (preferred for CSRF protection)
	if (origin) {
		return allowedOrigins.has(origin)
	}

	// Fallback to Referer header
	if (referer) {
		try {
			const refererUrl = new URL(referer)
			return allowedOrigins.has(refererUrl.origin)
		} catch {
			return false
		}
	}

	// No Origin or Referer header — reject for mutation requests
	return false
}
