/**
 * Session Utilities
 *
 * Provides session helpers for accessing and managing authentication state.
 * Supports both authenticated users (via NextAuth) and guest sessions.
 *
 * Guest sessions use JWT-signed tokens to prevent tampering:
 * - JWT is signed with GUEST_JWT_SECRET using HS256 algorithm
 * - JWT expires after 1 hour (GUEST_TOKEN_TTL.jwtExpiration)
 * - Cookie persists for 7 days for UX (sliding window)
 * - Token rotation happens when JWT is near expiration
 *
 * @module lib/auth/session
 */

import "server-only"

import { jwtVerify, SignJWT } from "jose"
import { cookies } from "next/headers"
import { CACHE_TTL, GUEST_TOKEN_TTL } from "@/lib/constants"
import { UnauthorizedError } from "@/lib/errors"
import { auth } from "./index"

// =============================================================================
// Types
// =============================================================================

/**
 * User type distinguishing between authenticated and guest users
 */
export type AppUserType = "guest" | "regular"

/**
 * Session user with type information
 */
export interface AppSessionUser {
	/** User ID (UUID for regular, guest:UUID for guests) */
	id: string
	/** User type: regular (authenticated) or guest */
	type: AppUserType
	/** Email (only for authenticated users) */
	email?: string | null
	/** Display name (only for authenticated users) */
	name?: string | null
	/** Avatar image (only for authenticated users) */
	image?: string | null
}

/**
 * Application session type
 */
export interface AppSession {
	/** Session user */
	user: AppSessionUser
	/** Session expiration timestamp (ISO string) */
	expires?: string
}

// =============================================================================
// Constants
// =============================================================================

/** Cookie name for guest session token */
const GUEST_COOKIE_NAME = "guest_id"

/** Guest ID prefix for identification */
const GUEST_ID_PREFIX = "guest:"

/** Text encoder for JWT secret */
const encoder = new TextEncoder()

// =============================================================================
// JWT Secret Helpers
// =============================================================================

/**
 * Get the JWT secret for guest token signing/verification
 * @returns Uint8Array secret or null if not configured
 */
function getGuestJwtSecret(): Uint8Array | null {
	const secret = process.env.GUEST_JWT_SECRET
	if (!secret) {
		return null
	}
	return encoder.encode(secret)
}

async function signGuestToken(
	guestId: string,
	secret: Uint8Array,
): Promise<string> {
	const issuedAtSeconds = Math.floor(Date.now() / 1000)
	const expiresAtSeconds = issuedAtSeconds + GUEST_TOKEN_TTL.jwtExpiration

	return new SignJWT({
		sub: guestId,
		type: "guest",
		iat: issuedAtSeconds,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt(issuedAtSeconds)
		.setExpirationTime(expiresAtSeconds)
		.sign(secret)
}

function shouldRotateGuestToken(exp: unknown): boolean {
	if (typeof exp !== "number") {
		return true
	}

	const nowSeconds = Math.floor(Date.now() / 1000)
	const timeRemaining = exp - nowSeconds
	return timeRemaining < GUEST_TOKEN_TTL.rotationThreshold
}

// =============================================================================
// Session Functions
// =============================================================================

/**
 * Get the current session (server-side)
 *
 * Checks for authenticated session first, then falls back to guest session.
 *
 * @returns The current session or null if no session exists
 *
 * @example
 * ```typescript
 * const session = await getSession();
 * if (session) {
 *   console.log('User ID:', session.user.id);
 *   console.log('Is guest:', session.user.type === 'guest');
 * }
 * ```
 */
export async function getSession(): Promise<AppSession | null> {
	// Check authenticated session first
	const authSession = await auth()
	if (authSession?.user?.id) {
		return {
			user: {
				id: authSession.user.id,
				type: "regular",
				email: authSession.user.email ?? null,
				name: authSession.user.name ?? null,
				image: authSession.user.image ?? null,
			},
			expires: authSession.expires,
		}
	}

	// Fall back to guest session
	return getGuestSession()
}

/**
 * Get the current session or throw UnauthorizedError
 *
 * Use this when a session is required for an operation.
 * For guest-allowed operations, use getSession() instead.
 *
 * @returns The current session
 * @throws UnauthorizedError if no session exists
 *
 * @example
 * ```typescript
 * // In a server action that requires authentication
 * const session = await requireSession();
 * // session is guaranteed to exist
 * ```
 */
export async function requireSession(): Promise<AppSession> {
	const session = await getSession()

	if (!session) {
		throw new UnauthorizedError("Authentication required")
	}

	return session
}

/**
 * Check if the current user is authenticated (not a guest)
 *
 * @returns true if the user is authenticated, false if guest or no session
 *
 * @example
 * ```typescript
 * if (await isAuthenticated()) {
 *   // User is logged in with credentials
 * }
 * ```
 */
export async function isAuthenticated(): Promise<boolean> {
	const session = await getSession()
	return session?.user.type === "regular"
}

/**
 * Get the current user from session
 *
 * @returns The current user or null if no session exists
 *
 * @example
 * ```typescript
 * const user = await getSessionUser();
 * if (user) {
 *   console.log('User email:', user.email);
 * }
 * ```
 */
export async function getSessionUser(): Promise<AppSessionUser | null> {
	const session = await getSession()
	return session?.user ?? null
}

/**
 * Get the current user ID
 *
 * @returns The current user ID (including guest IDs) or null
 *
 * @example
 * ```typescript
 * const userId = await getUserId();
 * if (userId) {
 *   // Can be used for data ownership
 * }
 * ```
 */
export async function getUserId(): Promise<string | null> {
	const session = await getSession()
	return session?.user.id ?? null
}

// =============================================================================
// Guest Session Functions
// =============================================================================

/**
 * Check if a session belongs to a guest user
 *
 * @param session - The session to check
 * @returns true if the session is a guest session
 *
 * @example
 * ```typescript
 * const session = await getSession();
 * if (isGuest(session)) {
 *   // Apply guest limitations
 * }
 * ```
 */
export function isGuest(session: AppSession | null): boolean {
	return session?.user.type === "guest"
}

/**
 * Check if a user ID belongs to a guest
 *
 * @param userId - The user ID to check
 * @returns true if the ID is a guest ID
 */
export function isGuestId(userId: string | null | undefined): boolean {
	return typeof userId === "string" && userId.startsWith(GUEST_ID_PREFIX)
}

/**
 * Get the guest ID from the current session
 *
 * @returns The guest ID or null if not a guest session
 */
export async function getGuestId(): Promise<string | null> {
	const session = await getSession()
	if (session?.user.type === "guest") {
		return session.user.id
	}
	return null
}

/**
 * Get or create a guest session
 *
 * Creates a new guest ID if one doesn't exist.
 * Returns the existing guest ID if present.
 *
 * @returns The guest session
 *
 * @example
 * ```typescript
 * // In a server action that allows guest access
 * const guestSession = await getOrCreateGuestSession();
 * const guestId = guestSession.user.id;
 * ```
 */
export async function getOrCreateGuestSession(): Promise<AppSession> {
	// Check for existing guest session
	const existingGuest = await getGuestSession()
	if (existingGuest) {
		return existingGuest
	}

	// Create new guest session
	return createGuestSession()
}

// =============================================================================
// Internal Guest Session Functions
// =============================================================================

/**
 * Get guest session from cookies
 *
 * Verifies the JWT token from the guest cookie. Returns null if:
 * - No cookie exists
 * - JWT secret is not configured
 * - Token is invalid or expired
 */
async function getGuestSession(): Promise<AppSession | null> {
	try {
		const secret = getGuestJwtSecret()
		if (!secret) {
			// JWT secret not configured - cannot verify tokens
			return null
		}

		const cookieStore = await cookies()
		const token = cookieStore.get(GUEST_COOKIE_NAME)?.value

		if (!token) {
			return null
		}

		// Verify the JWT token
		const { payload } = await jwtVerify(token, secret)

		// Validate payload has required fields
		if (!payload.sub || typeof payload.sub !== "string") {
			return null
		}

		// Validate guest ID format
		if (!payload.sub.startsWith(GUEST_ID_PREFIX)) {
			return null
		}

		// Validate token type
		if (payload.type !== "guest") {
			return null
		}

		if (shouldRotateGuestToken(payload.exp)) {
			try {
				const rotatedToken = await signGuestToken(payload.sub, secret)
				cookieStore.set(GUEST_COOKIE_NAME, rotatedToken, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: "lax",
					maxAge: CACHE_TTL.guest,
					path: "/",
				})
			} catch {
				// Cookies may not be writable in all contexts
			}
		}

		return {
			user: {
				id: payload.sub,
				type: "guest",
			},
		}
	} catch {
		// Token verification failed (expired, invalid, etc.)
		// Return null to trigger new session creation
		return null
	}
}

/**
 * Create a new guest session with JWT-signed token
 *
 * Security features:
 * - JWT signed with HS256 algorithm using GUEST_JWT_SECRET
 * - Token expires after 1 hour (GUEST_TOKEN_TTL.jwtExpiration)
 * - Cookie persists for 7 days for UX (CACHE_TTL.guest)
 * - Token rotation happens when JWT is near expiration
 */
async function createGuestSession(): Promise<AppSession> {
	const secret = getGuestJwtSecret()
	const guestId = `${GUEST_ID_PREFIX}${crypto.randomUUID()}`

	if (!secret) {
		throw new Error("GUEST_JWT_SECRET is required for guest sessions")
	}

	const token = await signGuestToken(guestId, secret)

	try {
		const cookieStore = await cookies()
		// Cookie TTL is longer than JWT TTL - middleware will rotate the token
		cookieStore.set(GUEST_COOKIE_NAME, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: CACHE_TTL.guest,
			path: "/",
		})
	} catch {
		// Cookies may not be available in all contexts
		// Still return the session, just won't persist
	}

	return {
		user: {
			id: guestId,
			type: "guest",
		},
	}
}

// =============================================================================
// Session Context Helpers
// =============================================================================

/**
 * Create a repository context from the current session
 *
 * @returns Context object with user ID and guest status
 *
 * @example
 * ```typescript
 * const ctx = await createSessionContext();
 * // Use ctx.userId and ctx.isGuest in repositories
 * ```
 */
export async function createSessionContext(): Promise<{
	userId: string | null
	isGuest: boolean
}> {
	const session = await getSession()
	return {
		userId: session?.user.id ?? null,
		isGuest: isGuest(session),
	}
}

/**
 * Require an authenticated (non-guest) session
 *
 * @returns The authenticated session
 * @throws UnauthorizedError if not authenticated or is a guest
 *
 * @example
 * ```typescript
 * // For operations that require full authentication
 * const session = await requireAuthenticatedSession();
 * ```
 */
export async function requireAuthenticatedSession(): Promise<AppSession> {
	const session = await getSession()

	if (!session || session.user.type === "guest") {
		throw new UnauthorizedError("Authentication required")
	}

	return session
}
