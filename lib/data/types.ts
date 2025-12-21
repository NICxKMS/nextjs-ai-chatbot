/**
 * Data Layer Types
 * Ref: 03-data-layer-optimal-design.md §7
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
