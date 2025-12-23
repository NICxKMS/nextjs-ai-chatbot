/**
 * Guest Token Extraction Utilities
 * SEC-003: Guest-to-Auth Session Migration
 *
 * Provides utilities to extract guest ID from JWT tokens
 * without full verification (for migration purposes).
 *
 * CLN-004: Improved error handling with debug logging.
 */
import "server-only";

import { decodeJwt } from "jose";
import { logger } from "@/lib/utils/logger";
import type { GuestTokenPayload } from "./types";

/**
 * Extract guest ID from a guest token without verification
 *
 * SEC-003: Used during auth callback to get guest ID for migration.
 * We decode without verification because:
 * 1. The token was already validated when the session was created
 * 2. We just need to extract the guest ID for migration lookup
 * 3. If the token is invalid/tampered, migration will simply be a no-op
 *
 * @param token - Guest JWT token from cookie
 * @returns Guest ID (without "guest:" prefix) or null if invalid
 */
export function extractGuestIdFromToken(token: string): string | null {
    try {
        // Decode without verification - safe for this use case
        const payload = decodeJwt(token) as Partial<GuestTokenPayload>;

        // Validate it's a guest token
        if (payload.type !== "guest") {
            return null;
        }

        // Extract the ID from 'guest:{id}' format
        if (
            typeof payload.sub === "string" &&
            payload.sub.startsWith("guest:")
        ) {
            return payload.sub.replace("guest:", "");
        }

        return null;
    } catch (error) {
        // CLN-004: Debug log for token extraction failures (expected for invalid tokens)
        logger.debug("[extract-guest] extractGuestIdFromToken failed", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Check if a token is a valid guest token structure
 *
 * @param token - JWT token to check
 * @returns true if token appears to be a guest token
 */
export function isGuestToken(token: string): boolean {
    try {
        const payload = decodeJwt(token) as Partial<GuestTokenPayload>;
        return payload.type === "guest" && typeof payload.sub === "string";
    } catch (error) {
        // CLN-004: Debug log for token check failures (expected for invalid tokens)
        logger.debug("[extract-guest] isGuestToken check failed", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return false;
    }
}
