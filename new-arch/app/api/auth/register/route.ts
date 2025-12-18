/**
 * Register Route
 * @module new-arch/app/api/auth/register/route
 *
 * API route for user registration.
 */

import { z } from "zod";
import { badRequest, created, createRouteHandler } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { sessionManager } from "@/lib/auth/session-manager";
import { createUser, getUserByEmail } from "@/lib/data/user";

// ============================================================================
// Schemas
// ============================================================================

const registerBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(100),
    name: z.string().min(1).max(100).optional(),
});

// ============================================================================
// Types
// ============================================================================

type RegisterResponse = {
    user: {
        id: string;
        email: string;
    };
    token?: string;
};

// ============================================================================
// Route Handlers
// ============================================================================

export const maxDuration = 10;

/**
 * POST /api/auth/register
 *
 * Register a new user.
 */
export const POST = createRouteHandler(
    {
        surface: "auth",
        method: "POST",
        auth: "none",
        rateLimit: "strict",
        bodySchema: registerBodySchema,
    },
    async ({ body }) => {
        const { email, password } = body;

        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return badRequest("Email already registered");
        }

        // Hash password before storing
        const passwordHash = await hashPassword(password);

        // Create user
        const user = await createUser({
            email,
            passwordHash,
        });

        // Create guest session
        const session = await sessionManager.createGuestSession();
        if (!session) {
            return badRequest("Failed to create session");
        }

        return created<RegisterResponse>({
            user: {
                id: user.id,
                email: user.email,
            },
            token: session.guestToken,
        });
    }
);
