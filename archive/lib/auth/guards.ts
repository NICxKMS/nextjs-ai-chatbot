/**
 * Auth Guards
 * Ref: 02-authentication-optimal-design.md §8
 *
 * Provides authentication guards for Server Actions and API Routes
 */

import { nanoid } from "nanoid";
import { authError, forbiddenError } from "@/lib/errors";
import { buildContext, getSession } from "./session";
import type { AppSession, AuthResult } from "./types";

type Surface = "chat" | "document" | "history" | "vote" | "api";

/**
 * Require authentication for Server Actions
 * Throws AppError if not authenticated
 */
export async function requireAuth(surface: Surface): Promise<AuthResult> {
    const session = await getSession();

    if (!session) {
        throw authError("unauthorized", { surface });
    }

    const requestId = nanoid();
    const ctx = buildContext(session, requestId);

    return { session, ctx };
}

/**
 * Require authentication for API Routes
 * Returns Response on failure (does not throw)
 */
export async function requireAuthForRoute(
    surface: Surface
): Promise<AuthResult | Response> {
    const session = await getSession();

    if (!session) {
        return authError("unauthorized", { surface }).toResponse();
    }

    const requestId = nanoid();
    const ctx = buildContext(session, requestId);

    return { session, ctx };
}

/**
 * Type guard to check if requireAuthForRoute returned a Response
 */
export function isAuthResponse(
    result: AuthResult | Response
): result is Response {
    return result instanceof Response;
}

/**
 * Verify resource ownership
 * Throws AppError if user doesn't own the resource
 */
export function verifyOwnership(
    session: AppSession,
    resourceUserId: string,
    resourceType: string
): void {
    if (session.user.id !== resourceUserId) {
        throw forbiddenError(resourceType, {
            userId: session.user.id,
            resourceUserId,
        });
    }
}

/**
 * Restrict access to regular users only
 * Throws AppError if user is a guest
 */
export function requireRegularUser(session: AppSession, feature: string): void {
    if (session.user.type === "guest") {
        throw authError("forbidden", {
            feature,
            reason: "Guest users cannot access this feature",
        });
    }
}

/**
 * Get session without throwing
 * Returns null if not authenticated
 */
export async function getOptionalAuth(): Promise<AuthResult | null> {
    const session = await getSession();

    if (!session) {
        return null;
    }

    const requestId = nanoid();
    const ctx = buildContext(session, requestId);

    return { session, ctx };
}
