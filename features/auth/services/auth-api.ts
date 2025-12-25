/**
 * Auth API Client
 *
 * Client-side API service for authentication operations.
 * Centralizes fetch calls for auth endpoints.
 *
 * @module features/auth/services/auth-api
 */

import type { AppSession } from "@/lib/auth";
import { logger } from "@/lib/utils/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Guest session creation response.
 */
export interface GuestSessionResponse {
    user?: AppSession["user"] | null;
    isNewSession?: boolean;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Create a guest session.
 *
 * @returns Guest session data or null on failure
 */
export async function createGuestSession(): Promise<GuestSessionResponse | null> {
    try {
        const response = await fetch("/api/auth/guest", {
            method: "POST",
            credentials: "include",
        });

        if (!response.ok) {
            return null;
        }

        return response.json();
    } catch (error) {
        // Guest bootstrap is best-effort, but log for visibility
        logger.warn("Guest session creation failed", {
            operation: "createGuestSession",
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}
