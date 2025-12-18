import "server-only";

import { eq } from "drizzle-orm";
import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type User, user } from "../schema";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a user by their ID
 *
 * @param userId - The user UUID
 * @returns The user or null if not found
 */
export async function getUserById(userId: string): Promise<User | null> {
    try {
        const [result] = await db
            .select()
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        return result ?? null;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch user by ID",
            context: { userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Get a user by their email address
 *
 * @param email - The user's email
 * @returns The user or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
    try {
        const [result] = await db
            .select()
            .from(user)
            .where(eq(user.email, email))
            .limit(1);

        return result ?? null;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch user by email",
            context: { email },
            cause: error instanceof Error ? error : undefined,
        });
    }
}
