import "server-only";

import type { AppSession } from "@/lib/auth/session";
import type { Chat, MessageRow } from "../db/schema";

/**
 * Data Access Layer Base - Shared types and utilities
 *
 * This module provides the foundation for the unified data access layer,
 * including context types, result types, and user type detection.
 */

/**
 * Context object passed to all data access methods
 * Contains user identification and guest status
 */
export type DataContext = {
    userId: string;
    isGuest: boolean;
};

/**
 * Create a data context from an AppSession
 * This is the standard way to construct context for data operations
 *
 * @param session AppSession object
 * @returns DataContext with userId and guest status
 * @throws Error if session or user is missing
 */
export function createContext(session: AppSession): DataContext {
    if (!session?.user?.id) {
        throw new Error("Session user ID is required");
    }

    return {
        userId: session.user.id,
        isGuest: session.user.type === "guest",
    };
}

/**
 * Helper to check if a session represents a guest user
 * Uses the session.user.type field set during authentication
 *
 * @param session AppSession object
 * @returns true if user is a guest, false otherwise
 */
export function isGuest(session: AppSession | null | undefined): boolean {
    return session?.user?.type === "guest";
}

/**
 * Chat with messages result type
 * Used for operations that fetch both chat metadata and messages together
 */
export type ChatWithMessages = {
    chat: Chat;
    messages: MessageRow[];
};

/**
 * Pagination parameters for list operations
 */
export type PaginationParams = {
    limit: number;
    startingAfter: string | null;
    endingBefore: string | null;
};

/**
 * Paginated list result
 */
export type PaginatedResult<T> = {
    items: T[];
    hasMore: boolean;
};

/**
 * Operation result wrapper for operations that may fail gracefully
 */
export type OperationResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

/**
 * Create a successful operation result
 */
export function success<T>(data: T): OperationResult<T> {
    return { success: true, data };
}

/**
 * Create a failed operation result
 */
export function failure<T>(error: string): OperationResult<T> {
    return { success: false, error };
}
