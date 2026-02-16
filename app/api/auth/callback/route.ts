/**
 * OAuth Callback API Route
 *
 * Handles OAuth provider callbacks and token exchange.
 * Delegates to NextAuth handlers for standard OAuth flows.
 *
 * @module app/api/auth/callback
 */

import { handlers } from "@/lib/auth"

/**
 * GET /api/auth/callback
 * Handles OAuth provider callbacks (Google, GitHub, etc.)
 */
export const GET = handlers.GET
