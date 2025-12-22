/**
 * Cache Invalidation Utilities
 *
 * Centralized cache invalidation strategies for:
 * - User logout/session changes
 * - Data mutations
 * - State synchronization
 *
 * @module lib/cache/invalidation
 */

"use client";

import { storage } from "@/lib/utils/storage";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Invalidation scope determines what data to clear
 */
export type InvalidationScope =
    /** Clear all cached data (full logout) */
    | "all"
    /** Clear only session-specific data (soft refresh) */
    | "session"
    /** Clear only chat-related caches */
    | "chats"
    /** Clear only document caches */
    | "documents"
    /** Clear settings only */
    | "settings";

/**
 * Result of an invalidation operation
 */
export type InvalidationResult = {
    /** Number of items cleared */
    cleared: number;
    /** Scopes that were invalidated */
    scopes: InvalidationScope[];
    /** Any errors encountered */
    errors: string[];
};

/**
 * Registered invalidation handlers
 */
type InvalidationHandler = {
    scope: InvalidationScope | InvalidationScope[];
    handler: () => void | Promise<void>;
    name: string;
};

// =============================================================================
// REGISTRY
// =============================================================================

/**
 * Registry of invalidation handlers
 * Components can register their own cleanup handlers
 */
const invalidationHandlers: InvalidationHandler[] = [];

/**
 * Register a custom invalidation handler
 *
 * @param name - Handler name for debugging
 * @param scope - Scope(s) this handler responds to
 * @param handler - Cleanup function
 * @returns Unregister function
 *
 * @example
 * ```ts
 * // In a React component
 * useEffect(() => {
 *   const unregister = registerInvalidationHandler(
 *     'chatHistory',
 *     'chats',
 *     () => setChatHistory([])
 *   );
 *   return unregister;
 * }, []);
 * ```
 */
export function registerInvalidationHandler(
    name: string,
    scope: InvalidationScope | InvalidationScope[],
    handler: () => void | Promise<void>
): () => void {
    const entry: InvalidationHandler = { name, scope, handler };
    invalidationHandlers.push(entry);

    return () => {
        const index = invalidationHandlers.indexOf(entry);
        if (index > -1) {
            invalidationHandlers.splice(index, 1);
        }
    };
}

// =============================================================================
// CORE INVALIDATION
// =============================================================================

/**
 * Execute invalidation for given scopes
 *
 * @param scopes - Scopes to invalidate
 * @returns Invalidation result
 */
async function executeInvalidation(
    scopes: InvalidationScope[]
): Promise<InvalidationResult> {
    const result: InvalidationResult = {
        cleared: 0,
        scopes: [...scopes],
        errors: [],
    };

    // Run registered handlers
    for (const { name, scope, handler } of invalidationHandlers) {
        const handlerScopes = Array.isArray(scope) ? scope : [scope];
        const shouldRun =
            scopes.includes("all") ||
            handlerScopes.some((s) => scopes.includes(s));

        if (shouldRun) {
            try {
                await handler();
                result.cleared++;
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`${name}: ${message}`);
            }
        }
    }

    return result;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Invalidate caches on user logout
 *
 * Clears:
 * - All localStorage data
 * - In-memory caches (via handlers)
 * - Zustand stores (if registered)
 *
 * @returns Invalidation result
 *
 * @example
 * ```ts
 * // In logout handler
 * const handleLogout = async () => {
 *   await signOut();
 *   await invalidateOnLogout();
 *   router.push('/login');
 * };
 * ```
 */
export async function invalidateOnLogout(): Promise<InvalidationResult> {
    // Clear all localStorage
    const storageCleared = storage.clearAll();

    // Execute all handlers
    const result = await executeInvalidation(["all"]);
    result.cleared += storageCleared;

    return result;
}

/**
 * Invalidate session-specific data (soft refresh)
 *
 * Useful when:
 * - User switches accounts
 * - Session expires but user re-authenticates
 * - Forcing a fresh state without full logout
 *
 * @returns Invalidation result
 */
export async function invalidateSession(): Promise<InvalidationResult> {
    // Clear session-related storage patterns
    const draftCleared = storage.clearPattern("draft:*");

    // Execute session handlers
    const result = await executeInvalidation(["session", "chats"]);
    result.cleared += draftCleared;

    return result;
}

/**
 * Invalidate chat-related caches
 *
 * Call when:
 * - Chat is deleted
 * - Chat list needs refresh
 * - Visibility changes
 *
 * @param chatId - Optional specific chat ID to invalidate
 * @returns Invalidation result
 */
export async function invalidateChats(
    chatId?: string
): Promise<InvalidationResult> {
    if (chatId) {
        // Clear specific chat draft
        storage.remove({ key: `draft:${chatId}`, defaultValue: "" });
    }

    return executeInvalidation(["chats"]);
}

/**
 * Invalidate document caches
 *
 * Call when:
 * - Document is updated
 * - Document is deleted
 * - User permissions change
 *
 * @returns Invalidation result
 */
export async function invalidateDocuments(): Promise<InvalidationResult> {
    return executeInvalidation(["documents"]);
}

/**
 * Invalidate settings
 *
 * Call when:
 * - Settings are reset
 * - User preferences need refresh
 *
 * @returns Invalidation result
 */
export async function invalidateSettings(): Promise<InvalidationResult> {
    return executeInvalidation(["settings"]);
}

/**
 * Create a scoped invalidator for a specific context
 *
 * @param defaultScopes - Default scopes for this invalidator
 * @returns Scoped invalidate function
 *
 * @example
 * ```ts
 * const invalidateChat = createScopedInvalidator(['chats']);
 * // Later...
 * await invalidateChat();
 * ```
 */
export function createScopedInvalidator(
    defaultScopes: InvalidationScope[]
): () => Promise<InvalidationResult> {
    return () => executeInvalidation(defaultScopes);
}

// =============================================================================
// REACT HOOKS
// =============================================================================

/**
 * Hook to register a component's invalidation handler
 *
 * @param name - Handler name
 * @param scope - Scope(s) to respond to
 * @param handler - Cleanup function
 *
 * @example
 * ```tsx
 * function ChatHistory() {
 *   const [history, setHistory] = useState([]);
 *
 *   useInvalidationHandler('chatHistory', 'chats', () => {
 *     setHistory([]);
 *   });
 *
 *   // ...
 * }
 * ```
 */
export function useInvalidationHandler(
    _name: string,
    _scope: InvalidationScope | InvalidationScope[],
    _handler: () => void | Promise<void>
): void {
    // Note: This is a placeholder function.
    // Use the actual React hook from lib/cache/use-invalidation.ts instead:
    //
    // import { useInvalidation } from '@/lib/cache';
    // useInvalidation('name', 'scope', handler);
    //
    // This function exists only for API documentation purposes.
    console.warn(
        "useInvalidationHandler is deprecated. Use useInvalidation from '@/lib/cache' instead."
    );
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get list of registered handlers (for debugging)
 */
export function getRegisteredHandlers(): string[] {
    return invalidationHandlers.map((h) => h.name);
}

/**
 * Clear all registered handlers (for testing)
 */
export function clearAllHandlers(): void {
    invalidationHandlers.length = 0;
}
