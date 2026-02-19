/**
 * NextAuth.js v5 Configuration
 *
 * Authentication configuration with credentials provider and JWT session strategy.
 * Supports email/password authentication with custom session callbacks.
 *
 * @module lib/auth/config
 */

import { eq } from "drizzle-orm"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { user } from "@/lib/db/schema"

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Get the NextAuth secret from environment variables
 * Used to sign and encrypt tokens
 */
function getAuthSecret(): string {
	const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
	if (!secret) {
		throw new Error(
			"NEXTAUTH_SECRET or AUTH_SECRET environment variable is not set",
		)
	}
	return secret
}

// =============================================================================
// Credentials Schema Validation
// =============================================================================

/**
 * Zod schema for validating credentials input
 */
const credentialsSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
})

// =============================================================================
// Authentication Providers
// =============================================================================

/**
 * Credentials provider configuration
 * Authenticates users with email and password
 */
const credentialsProvider = Credentials({
	name: "credentials",
	credentials: {
		email: { label: "Email", type: "email" },
		password: { label: "Password", type: "password" },
	},
	async authorize(credentials) {
		// Validate credentials format
		const parsed = credentialsSchema.safeParse(credentials)
		if (!parsed.success) {
			return null
		}

		const { email, password } = parsed.data

		try {
			// Find user by email
			const [foundUser] = await db
				.select()
				.from(user)
				.where(eq(user.email, email))
				.limit(1)

			// User not found
			if (!foundUser) {
				return null
			}

			// Check if user has a password hash (not OAuth-only user)
			if (!foundUser.passwordHash) {
				return null
			}

			// Verify password using bcrypt
			// Note: Password verification will be handled by auth.service in Task 2.4c
			// For now, we use a placeholder that will be replaced
			const { compare } = await import("bcrypt")
			const isValid = await compare(password, foundUser.passwordHash)

			if (!isValid) {
				return null
			}

			// Return user object that will be stored in the JWT
			return {
				id: foundUser.id,
				email: foundUser.email,
				name: null,
				image: null,
			}
		} catch (error) {
			// Log error but don't expose details
			console.error("Auth error:", error)
			return null
		}
	},
})

// =============================================================================
// NextAuth Configuration
// =============================================================================

/**
 * NextAuth.js v5 configuration object
 *
 * @see https://authjs.dev/getting-started/installation
 */
export const authConfig: NextAuthConfig = {
	// Custom authentication pages
	pages: {
		signIn: "/login",
		error: "/login",
	},

	// Session configuration
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60, // 30 days
		updateAge: 24 * 60 * 60, // 24 hours
	},

	// Authentication providers
	providers: [credentialsProvider],

	// Callbacks for customizing authentication behavior
	callbacks: {
		/**
		 * Authorized callback - controls access to protected routes
		 * Used in middleware for route protection
		 */
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user
			const isOnAuthPage =
				nextUrl.pathname.startsWith("/login") ||
				nextUrl.pathname.startsWith("/register")

			// Allow public routes
			const isPublicRoute =
				nextUrl.pathname === "/" ||
				nextUrl.pathname.startsWith("/api/auth") ||
				nextUrl.pathname.startsWith("/api/health")

			if (isPublicRoute) {
				return true
			}

			// Redirect logged-in users away from auth pages
			if (isOnAuthPage) {
				if (isLoggedIn) {
					return Response.redirect(new URL("/", nextUrl))
				}
				return true
			}

			// Require authentication for protected routes
			return isLoggedIn
		},

		/**
		 * JWT callback - called when JWT is created or updated
		 * Add custom fields to the token
		 */
		jwt({ token, user }) {
			// On initial sign in, add user id to token
			if (user) {
				token.id = user.id
			}
			return token
		},

		/**
		 * Session callback - called when session is checked
		 * Add custom fields to the session
		 */
		session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id as string
			}
			return session
		},
	},

	// Enable debug mode in development
	debug: process.env.NODE_ENV === "development",

	// Secret for signing tokens
	secret: getAuthSecret(),
}

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Extended user type with id field
 * This type is merged with next-auth types in index.ts
 */
export interface ExtendedUser {
	id: string
	email?: string | null
	name?: string | null
	image?: string | null
}

export type { NextAuthConfig }
