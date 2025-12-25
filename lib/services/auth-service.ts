/**
 * Auth Service
 *
 * Business logic layer for authentication-related operations.
 * Provides a clean abstraction over the data layer for auth flows.
 *
 * @module lib/services/auth-service
 */
import "server-only";

import type { MigrationResult } from "@/lib/data/migrate-guest";
import { migrateGuestToAuthUser as migrateGuestData } from "@/lib/data/migrate-guest";
import { logger } from "@/lib/utils/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Auth service result
 */
export type AuthServiceResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; code: string };

/**
 * Guest migration parameters
 */
export interface MigrateGuestParams {
    /** Guest user ID (short nanoid, NOT prefixed) */
    guestId: string;
    /** Authenticated user's Supabase UID */
    authUserId: string;
}

// =============================================================================
// AUTH SERVICE
// =============================================================================

/**
 * Auth Service
 *
 * Provides business logic for authentication-related operations
 * with proper validation, logging, and error handling.
 */
export const AuthService = {
    /**
     * Migrate guest user data to authenticated user
     *
     * SEC-003: Guest-to-Auth Session Migration
     *
     * @param params - Migration parameters
     * @returns Migration result
     */
    async migrateGuestToAuthUser(
        params: MigrateGuestParams
    ): Promise<AuthServiceResult<MigrationResult>> {
        const { guestId, authUserId } = params;

        try {
            // Validate inputs
            if (!guestId || typeof guestId !== "string") {
                return {
                    success: false,
                    error: "Invalid guest ID",
                    code: "validation:invalid_guest_id",
                };
            }

            if (!authUserId || typeof authUserId !== "string") {
                return {
                    success: false,
                    error: "Invalid auth user ID",
                    code: "validation:invalid_auth_user_id",
                };
            }

            // Validate authUserId is a UUID (Supabase format)
            const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(authUserId)) {
                return {
                    success: false,
                    error: "Auth user ID must be a valid UUID",
                    code: "validation:invalid_uuid",
                };
            }

            // Perform migration
            const result = await migrateGuestData(guestId, authUserId);

            if (result.success) {
                logger.info("[SEC-003] Guest data migration completed", {
                    guestId,
                    authUserId,
                    chats: result.migratedChats,
                    messages: result.migratedMessages,
                });
            } else {
                logger.error("[SEC-003] Guest data migration failed", {
                    guestId,
                    authUserId,
                    error: result.error,
                });
            }

            return { success: true, data: result };
        } catch (error) {
            logger.error("[SEC-003] Guest data migration error", {
                guestId,
                authUserId,
                error,
            });

            return {
                success: false,
                error:
                    error instanceof Error ? error.message : "Migration failed",
                code: "internal:migration_error",
            };
        }
    },
} as const;

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const migrateGuestToAuthUser = AuthService.migrateGuestToAuthUser;
