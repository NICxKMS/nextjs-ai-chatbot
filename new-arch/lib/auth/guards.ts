/**
 * Authentication guards for protecting server actions and routes
 * @module new-arch/lib/auth/guards
 */
import "server-only";

import { AppError, ErrorCodes } from "../errors";
import { sessionManager } from "./session-manager";
import type { AppSession } from "./types";

/** Result type for authenticated operations */
export type AuthResult = {
    session: AppSession;
};

/**
 * Require authenticated session.
 * Throws AppError if not authenticated.
 *
 * @example
 * const { session } = await requireAuth();
 * // session is guaranteed to exist
 */
export async function requireAuth(): Promise<AuthResult> {
    const session = await sessionManager.getSession();

    if (!session) {
        throw new AppError(ErrorCodes.AUTH_REQUIRED, {
            message: "Authentication required. Please sign in to continue.",
        });
    }

    return { session };
}

/**
 * Optional authentication.
 * Returns session if authenticated, null otherwise.
 *
 * @example
 * const session = await optionalAuth();
 * if (session) {
 *   // User is authenticated
 * }
 */
export function optionalAuth(): Promise<AppSession | null> {
    return sessionManager.getSession();
}

/**
 * Higher-order function wrapper for server actions requiring authentication.
 * Automatically validates session before executing the action.
 *
 * @example
 * export const createChat = withAuth(async (session, title: string) => {
 *   return db.chat.create({ userId: session.userId, title });
 * });
 */
export function withAuth<TArgs extends unknown[], TResult>(
    action: (session: AppSession, ...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
        const { session } = await requireAuth();
        return action(session, ...args);
    };
}

/**
 * Require non-guest user.
 * Throws AppError if user is a guest.
 *
 * @example
 * const { session } = await requireAuth();
 * requireNonGuest(session, 'share chats');
 */
export function requireNonGuest(session: AppSession, action: string): void {
    if (session.user.type === "guest") {
        throw new AppError(ErrorCodes.AUTH_REQUIRED, {
            message: `Please sign in to ${action}.`,
            context: { action, userType: "guest" },
        });
    }
}

/**
 * Verify resource ownership.
 * Throws AppError if user doesn't own the resource.
 *
 * @example
 * const chat = await db.chat.findById(chatId);
 * verifyOwnership(chat, session, 'chat');
 */
export function verifyOwnership(
    resource: { userId: string },
    session: AppSession,
    resourceType: string
): void {
    if (resource.userId !== session.userId) {
        throw new AppError(ErrorCodes.CHAT_ACCESS_DENIED, {
            message: `You do not have access to this ${resourceType}.`,
            context: { resourceType },
        });
    }
}

/**
 * Require authentication for API routes.
 * Returns Response on error instead of throwing.
 *
 * @example
 * export async function GET() {
 *   const result = await requireAuthForRoute();
 *   if (result instanceof Response) return result;
 *   const { session } = result;
 *   // ... handle authenticated request
 * }
 */
export async function requireAuthForRoute(): Promise<AuthResult | Response> {
    try {
        return await requireAuth();
    } catch (error) {
        if (error instanceof AppError) {
            return Response.json(error.toJSON(), { status: error.statusCode });
        }

        const appError = new AppError(ErrorCodes.AUTH_REQUIRED, {
            message: "Authentication failed.",
        });
        return Response.json(appError.toJSON(), { status: 401 });
    }
}
