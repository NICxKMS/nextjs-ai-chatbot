/**
 * Cached Suggestion Operations
 * Ref: 03-data-layer-optimal-design.md
 *
 * Cache-integrated suggestion data operations.
 * Strategy:
 * - READ: Cache-first, DB fallback
 * - WRITE: Write-through (DB first, then cache)
 * - DELETE: Delete from cache (suggestions deleted via document cleanup)
 * - GUEST: Cache-only
 */
import "server-only";

import type { UserContext } from "@/lib/cache/types";
import type { CachedSuggestion } from "@/lib/cache-ops/suggestions";
import {
    deleteSuggestionsFromCache,
    getSuggestionsFromCache,
    setSuggestionsInCache,
} from "@/lib/cache-ops/suggestions";
import type { Suggestion } from "@/lib/db";
import { isGuest } from "../base";
import { getDocumentSuggestions, saveSuggestions } from "../documents";
import type { DataContext } from "../types";

/**
 * Convert DataContext to UserContext for cache operations
 */
function toUserContext(ctx: DataContext): UserContext {
    return {
        userId: ctx.userId,
        isGuest: isGuest(ctx),
    };
}

/**
 * Convert DB suggestion to cached format
 */
function toCachedSuggestion(s: Suggestion): CachedSuggestion {
    return {
        id: s.id,
        documentId: s.documentId,
        originalText: s.originalText,
        suggestedText: s.suggestedText,
        description: s.description,
        isResolved: s.isResolved,
        createdAt: s.createdAt.getTime(),
    };
}

/**
 * Convert cached suggestion to DB format
 */
function fromCachedSuggestion(s: CachedSuggestion, userId: string): Suggestion {
    return {
        id: s.id,
        documentId: s.documentId,
        documentCreatedAt: new Date(s.createdAt), // Approximate - actual value from DB
        originalText: s.originalText,
        suggestedText: s.suggestedText,
        description: s.description ?? null,
        isResolved: s.isResolved,
        userId,
        createdAt: new Date(s.createdAt),
    };
}

/**
 * Get suggestions with cache-first strategy
 *
 * 1. Try cache
 * 2. Guest = cache-only, return empty array if miss
 * 3. Auth = DB fallback + cache warm
 */
export async function getSuggestionsCached(
    documentId: string,
    ctx: DataContext
): Promise<Suggestion[]> {
    const userCtx = toUserContext(ctx);

    // Try cache first
    const cached = await getSuggestionsFromCache(documentId, userCtx);
    if (cached !== null) {
        return cached.map((s) => fromCachedSuggestion(s, ctx.userId));
    }

    // Guest = cache-only
    if (isGuest(ctx)) {
        return [];
    }

    // Auth = DB fallback
    const suggestions = await getDocumentSuggestions(documentId, ctx);
    if (suggestions.length > 0) {
        // Warm cache
        const cachedSuggestions = suggestions.map(toCachedSuggestion);
        setSuggestionsInCache(documentId, cachedSuggestions, userCtx).catch(
            () => {}
        );
    }
    return suggestions;
}

/**
 * Save suggestions with write-through strategy
 *
 * 1. Write to DB
 * 2. Update cache
 *
 * Note: This is a bulk operation for saving multiple suggestions
 */
export async function saveSuggestionsCached(
    documentId: string,
    suggestions: Suggestion[],
    ctx: DataContext
): Promise<void> {
    if (suggestions.length === 0) {
        return;
    }

    const userCtx = toUserContext(ctx);
    const cachedSuggestions = suggestions.map(toCachedSuggestion);

    // Guest = cache-only
    if (isGuest(ctx)) {
        await setSuggestionsInCache(documentId, cachedSuggestions, userCtx);
        return;
    }

    // Auth = write-through
    await saveSuggestions(suggestions);

    // Update cache with the saved suggestions
    await setSuggestionsInCache(documentId, cachedSuggestions, userCtx);
}

/**
 * Invalidate suggestions cache
 *
 * Used when document is deleted or suggestions are cleared
 */
export async function invalidateSuggestionsCache(
    documentId: string,
    ctx: DataContext
): Promise<void> {
    const userCtx = toUserContext(ctx);
    await deleteSuggestionsFromCache(documentId, userCtx);
}
