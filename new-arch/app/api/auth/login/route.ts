/**
 * Login Route
 * @module new-arch/app/api/auth/login/route
 *
 * API route for user authentication.
 *
 * Note: This route is designed for email/password authentication.
 * For Supabase OAuth flows, use the client-side auth with /api/auth/exchange.
 */

import { z } from "zod";
import { createRouteHandler, json, unauthorized } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { sessionManager } from "@/lib/auth/session-manager";
import { getUserByEmail } from "@/lib/data/user";

// ============================================================================
// Schemas
// ============================================================================

const loginBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

// ============================================================================
// Types
// ============================================================================

type AuthResponse = {
    user: {
        id: string;
        email: string;
    };
};

// ============================================================================
// Route Handlers
// ============================================================================

export const maxDuration = 10;

/**
 * POST /api/auth/login
 *
 * Authenticate a user with email and password.
 * Creates a session and sets auth cookies on success.
 */
export const POST = createRouteHandler(
    {
        surface: "auth",
        method: "POST",
        auth: "none",
        rateLimit: "strict",
        bodySchema: loginBodySchema,
    },
    async ({ body }) => {
        const { email, password } = body;

        // Fetch user by email
        const user = await getUserByEmail(email);
        if (!user) {
            return unauthorized("Invalid email or password");
        }

        // Verify password hash
        if (!user.passwordHash) {
            // User may have registered via OAuth (no password)
            return unauthorized("Invalid email or password");
        }

        const isValidPassword = await verifyPassword(
            password,
            user.passwordHash
        );
        if (!isValidPassword) {
            return unauthorized("Invalid email or password");
        }

        // Create guest session (will be upgraded on exchange if using Supabase)
        // For direct auth, create a session token
        const session = await sessionManager.createGuestSession();
        if (!session) {
            return unauthorized("Failed to create session");
        }

        return json<AuthResponse>({
            user: {
                id: user.id,
                email: user.email,
            },
        });
    }
);
