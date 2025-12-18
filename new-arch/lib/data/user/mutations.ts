import "server-only";

import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type User, user } from "../schema";

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new user
 *
 * @param params - User creation parameters
 * @returns The created user
 * @throws AppError if creation fails
 */
export async function createUser(params: {
    email: string;
    passwordHash: string;
}): Promise<User> {
    try {
        const [result] = await db
            .insert(user)
            .values({
                email: params.email,
                passwordHash: params.passwordHash,
            } as typeof user.$inferInsert)
            .returning();

        if (!result) {
            throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
                message: "Failed to create user - no result returned",
                context: { email: params.email },
            });
        }

        return result;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        const cause = error instanceof Error ? error : undefined;
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to create user",
            context: { email: params.email },
            ...(cause && { cause }),
        });
    }
}
