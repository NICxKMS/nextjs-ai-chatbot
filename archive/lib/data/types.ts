/**
 * Data Layer Types
 * Ref: 03-data-layer-optimal-design.md §7
 *
 * P3-019: Null object pattern - use EMPTY_DATA_CONTEXT
 * instead of null checks throughout the codebase.
 */

import type { UserType } from "@/lib/auth/types";

/**
 * Context for data operations
 * Includes user info and request metadata
 */
export type DataContext = {
    userId: string;
    userType: UserType;
    requestId?: string;
};

// =============================================================================
// NULL OBJECT PATTERNS (P3-019)
// =============================================================================

/**
 * Empty data context for null object pattern.
 * Use instead of null checks: `ctx ?? EMPTY_DATA_CONTEXT`
 */
export const EMPTY_DATA_CONTEXT: DataContext = {
    userId: "",
    userType: "guest",
    requestId: undefined,
} as const;

/**
 * Check if a data context is the empty/null context object.
 */
export function isEmptyDataContext(ctx: DataContext): boolean {
    return ctx.userId === "";
}

/**
 * Pagination parameters for cursor-based pagination
 */
export type PaginationParams = {
    limit: number;
    startingAfter?: string | null;
    endingBefore?: string | null;
};

/**
 * Paginated result wrapper
 */
export type PaginatedResult<T> = {
    items: T[];
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
};

/**
 * Operation result for mutations
 */
export type OperationResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
