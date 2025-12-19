import "server-only";

import { type AppSession, getAppSession } from "@/lib/auth/session";
import { createContext, type DataContext } from "@/lib/data/base";
import type { Surface } from "@/lib/errors";
import { ChatSDKError, type ErrorCode } from "@/lib/errors";
import { logError } from "@/lib/log";
import {
    checkRateLimit,
    type RateLimitConfig,
    RateLimiters,
    type RateLimitResult,
} from "@/lib/middleware/rate-limit";

/**
 * ==============================================================================
 * API GUARD UTILITIES
 * ==============================================================================
 *
 * Centralized authentication, authorization, and rate limiting guards.
 * Eliminates duplicated error handling patterns across API routes.
 *
 * Usage:
 * - requireAuth(): Get authenticated session + context
 * - requireRateLimit(): Enforce rate limiting
 * - verifyOwnership(): Check resource ownership
 * - requireResource(): Ensure resource exists
 * - requireNonGuest(): Block guest users from specific actions
 */

export type AuthResult = {
    session: AppSession;
    ctx: DataContext;
};

/**
 * Require authenticated session and create data context.
 * Combines session retrieval + validation + context creation.
 *
 * @param surface - Error surface for unauthorized errors (e.g., "chat", "document")
 * @returns Session and DataContext
 * @throws ChatSDKError with unauthorized code if session invalid
 *
 * @example
 * ```typescript
 * const { session, ctx } = await requireAuth("chat");
 * const chat = await chatData.get(chatId, ctx);
 * ```
 */
export async function requireAuth(surface: Surface): Promise<AuthResult> {
    let session: AppSession | null;

    try {
        session = await getAppSession();
    } catch (error) {
        logError(`Session retrieval failed in ${surface}`, error);
        throw new ChatSDKError(
            `unauthorized:${surface}:session_error` as ErrorCode,
            "Failed to retrieve session"
        );
    }

    if (!session?.user) {
        throw new ChatSDKError(
            `unauthorized:${surface}:missing_session` as ErrorCode
        );
    }

    const ctx = createContext(session);
    return { session, ctx };
}

/**
 * Require authenticated session for API routes (returns Response on error).
 * Use this in route handlers where you need to return a Response.
 *
 * @param surface - Error surface for unauthorized errors
 * @returns Session and DataContext, or Response if auth fails
 *
 * @example
 * ```typescript
 * const authResult = await requireAuthForRoute("chat");
 * if (authResult instanceof Response) return authResult;
 * const { session, ctx } = authResult;
 * ```
 */
export async function requireAuthForRoute(
    surface: Surface
): Promise<AuthResult | Response> {
    try {
        return await requireAuth(surface);
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        return new ChatSDKError(
            `unauthorized:${surface}:session_error` as ErrorCode,
            "Unexpected authentication error"
        ).toResponse();
    }
}

/**
 * Enforce rate limiting for an identifier.
 * Throws ChatSDKError if rate limit exceeded.
 *
 * @param limiterType - Type of rate limiter (standard, strict, chat, upload)
 * @param identifier - User ID or other identifier
 * @param surface - Error surface for rate limit errors
 * @returns RateLimitResult if allowed
 * @throws ChatSDKError with rate_limit code if exceeded
 *
 * @example
 * ```typescript
 * await requireRateLimit("standard", session.user.id, "api");
 * ```
 */
export async function requireRateLimit(
    limiterType: "standard" | "strict" | "chat" | "upload",
    identifier: string,
    surface: Surface
): Promise<RateLimitResult> {
    const limiter = RateLimiters[limiterType];
    const result = await limiter(identifier);

    if (!result.allowed) {
        throw new ChatSDKError(
            `rate_limit:${surface}` as ErrorCode,
            `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
        );
    }

    return result;
}

/**
 * Enforce rate limiting for API routes (returns Response on error).
 *
 * @param limiterType - Type of rate limiter
 * @param identifier - User ID or other identifier
 * @param surface - Error surface for rate limit errors
 * @returns RateLimitResult if allowed, or Response if exceeded
 *
 * @example
 * ```typescript
 * const rateResult = await requireRateLimitForRoute("standard", session.user.id, "api");
 * if (rateResult instanceof Response) return rateResult;
 * ```
 */
export async function requireRateLimitForRoute(
    limiterType: "standard" | "strict" | "chat" | "upload",
    identifier: string,
    surface: Surface
): Promise<RateLimitResult | Response> {
    try {
        return await requireRateLimit(limiterType, identifier, surface);
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        throw error;
    }
}

/**
 * Enforce custom rate limiting configuration.
 *
 * @param config - Rate limit configuration
 * @param surface - Error surface for rate limit errors
 * @returns RateLimitResult if allowed
 * @throws ChatSDKError with rate_limit code if exceeded
 */
export async function requireCustomRateLimit(
    config: RateLimitConfig,
    surface: Surface
): Promise<RateLimitResult> {
    const result = await checkRateLimit(config);

    if (!result.allowed) {
        throw new ChatSDKError(
            `rate_limit:${surface}:too_many_requests` as ErrorCode,
            `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
        );
    }

    return result;
}

/**
 * Enforce custom rate limiting for API routes (returns Response on error).
 */
export async function requireCustomRateLimitForRoute(
    config: RateLimitConfig,
    surface: Surface
): Promise<RateLimitResult | Response> {
    try {
        return await requireCustomRateLimit(config, surface);
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        throw error;
    }
}

/**
 * Resource with userId for ownership verification
 */
type OwnedResource = {
    userId: string;
    [key: string]: unknown;
};

/**
 * Verify that the current user owns the resource.
 * Throws ChatSDKError if ownership check fails.
 *
 * @param resource - Resource with userId property
 * @param session - Current user session
 * @param surface - Error surface for forbidden errors
 * @throws ChatSDKError with forbidden:owner_mismatch if user doesn't own resource
 *
 * @example
 * ```typescript
 * const chat = await chatData.get(chatId, ctx);
 * verifyOwnership(chat, session, "chat");
 * ```
 */
export function verifyOwnership(
    resource: OwnedResource,
    session: AppSession,
    surface: Surface
): void {
    if (resource.userId !== session.user.id) {
        throw new ChatSDKError(
            `forbidden:${surface}:owner_mismatch` as ErrorCode
        );
    }
}

/**
 * Verify ownership for API routes (returns Response on error).
 *
 * @returns undefined if ownership verified, or Response if check fails
 */
export function verifyOwnershipForRoute(
    resource: OwnedResource,
    session: AppSession,
    surface: Surface
): Response | undefined {
    try {
        verifyOwnership(resource, session, surface);
        return;
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        throw error;
    }
}

/**
 * Require that a resource exists.
 * Throws ChatSDKError if resource is null/undefined.
 *
 * @param resource - Resource to check
 * @param surface - Error surface for not_found errors
 * @returns The resource (non-null)
 * @throws ChatSDKError with not_found code if resource doesn't exist
 *
 * @example
 * ```typescript
 * const chat = requireResource(await chatData.get(chatId, ctx), "chat");
 * // chat is guaranteed to be non-null here
 * ```
 */
export function requireResource<T>(
    resource: T | null | undefined,
    surface: Surface
): T {
    if (resource === null || resource === undefined) {
        throw new ChatSDKError(`not_found:${surface}` as ErrorCode);
    }
    return resource;
}

/**
 * Require resource for API routes (returns Response on error).
 *
 * @returns The resource if exists, or Response if not found
 */
export function requireResourceForRoute<T>(
    resource: T | null | undefined,
    surface: Surface
): T | Response {
    try {
        return requireResource(resource, surface);
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        throw error;
    }
}

/**
 * Require that the user is not a guest.
 * Throws ChatSDKError if user is a guest.
 *
 * @param session - Current user session
 * @param surface - Error surface for forbidden errors
 * @param action - Action being attempted (e.g., "vote", "save")
 * @throws ChatSDKError with forbidden:guest_cannot_{action} if user is guest
 *
 * @example
 * ```typescript
 * requireNonGuest(session, "vote", "vote");
 * ```
 */
export function requireNonGuest(
    session: AppSession,
    surface: Surface,
    action: string
): void {
    if (session.user.type === "guest") {
        throw new ChatSDKError(
            `forbidden:${surface}:guest_cannot_${action}` as ErrorCode,
            `Guest users cannot ${action}`
        );
    }
}

/**
 * Require non-guest for API routes (returns Response on error).
 *
 * @returns undefined if user is not guest, or Response if user is guest
 */
export function requireNonGuestForRoute(
    session: AppSession,
    surface: Surface,
    action: string
): Response | undefined {
    try {
        requireNonGuest(session, surface, action);
        return;
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        throw error;
    }
}
