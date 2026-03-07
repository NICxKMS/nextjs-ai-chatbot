import "server-only"

const DEVELOPMENT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"] as const

function getAllowedOrigins(requestUrl: URL): Set<string> {
	const allowedOrigins = new Set<string>([requestUrl.origin])

	if (process.env.VERCEL_URL) {
		allowedOrigins.add(`https://${process.env.VERCEL_URL}`)
	}

	if (process.env.NEXT_PUBLIC_APP_URL) {
		allowedOrigins.add(process.env.NEXT_PUBLIC_APP_URL)
	}

	if (process.env.NODE_ENV === "development") {
		for (const origin of DEVELOPMENT_ORIGINS) {
			allowedOrigins.add(origin)
		}
	}

	return allowedOrigins
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

	return getAllowedOrigins(new URL(request.url)).has(requestOrigin)
}
