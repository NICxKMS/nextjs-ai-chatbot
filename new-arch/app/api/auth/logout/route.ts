/**
 * Logout Route
 * @module new-arch/app/api/auth/logout/route
 *
 * API route for user logout.
 */

import { createRouteHandler, json } from "@/lib/api";
import { sessionManager } from "@/lib/auth/session-manager";

// ============================================================================
// Route Handlers
// ============================================================================

export const maxDuration = 10;

/**
 * POST /api/auth/logout
 *
 * Log out the current user by destroying their session.
 * Clears all auth-related cookies (session, guest, supabase).
 */
export const POST = createRouteHandler(
    {
        surface: "auth",
        method: "POST",
        auth: "required",
        rateLimit: "standard",
    },
    async () => {
        // Destroy session by clearing all auth cookies
        await sessionManager.destroySession();

        return json({ success: true, message: "Logged out successfully" });
    }
);
