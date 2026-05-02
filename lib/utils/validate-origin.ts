import "server-only"

const DEVELOPMENT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"] as const

// ── Module-level cache for allowed origins ─────────────────────

let _staticOrigins: Set<string> | null = null

/**
 * Lazily build and cache the set of allowed origins from environment variables.
 * The request URL's own origin is checked separately in `validateOrigin`.
 */
function getStaticAllowedOrigins(): Set<string> {
	if (_staticOrigins) return _staticOrigins

	const origins = new Set<string>()

	if (process.env.VERCEL_URL) {
		origins.add(`https://${process.env.VERCEL_URL}`)
	}

	if (process.env.NEXT_PUBLIC_APP_URL) {
		origins.add(process.env.NEXT_PUBLIC_APP_URL)
	}

	if (process.env.NODE_ENV === "development") {
		for (const origin of DEVELOPMENT_ORIGINS) {
			origins.add(origin)
		}
	}

	_staticOrigins = origins
	return origins
}

function getRequestOrigin(request: Request): string | null {
	const origin = request.headers.get("origin")
	if (origin) {
		return origin
	}

	const referer = request.headers.get("referer")
	if (!referer) {
		return null
	}

	try {
		return new URL(referer).origin
	} catch {
		return null
	}
}

/**
 * Validate Origin/Referer headers against allowed origins for CSRF protection.
 *
 * Next.js Server Actions have built-in CSRF protection, but Route Handlers
 * (app/api/) do NOT. This utility must be applied to all POST route handlers.
 *
 * Adapted from the old app's `lib/api/utils.ts`.
 */
export function validateOrigin(request: Request): boolean {
	const requestOrigin = getRequestOrigin(request)
	if (!requestOrigin) return false

	// Self-origin is always trusted (same-origin request)
	if (requestOrigin === new URL(request.url).origin) return true

	return getStaticAllowedOrigins().has(requestOrigin)
}
