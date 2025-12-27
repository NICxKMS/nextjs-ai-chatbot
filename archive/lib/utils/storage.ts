/**
 * Type-Safe Local Storage Wrapper
 *
 * Provides a type-safe API for localStorage operations with:
 * - JSON serialization/deserialization
 * - Error handling with fallback values
 * - SSR safety (no-op on server)
 * - Schema versioning support
 * - Namespaced keys to avoid collisions
 *
 * @module lib/utils/storage
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Storage key configuration with type information
 */
export type StorageKey<T> = {
    /** Unique key name (will be prefixed) */
    key: string;
    /** Default value when key is missing or invalid */
    defaultValue: T;
    /** Optional schema version for migrations */
    version?: number;
};

/**
 * Storage item with version metadata
 */
type StoredItem<T> = {
    value: T;
    version: number;
    updatedAt: number;
};

/**
 * Result of a storage operation.
 *
 * Uses discriminated union pattern for type-safe error handling:
 * - Check `success` property to narrow the type
 * - On success: access `value` safely
 * - On failure: access `error` message for logging/display
 *
 * @example
 * ```ts
 * const result = storage.get(StorageKeys.settings);
 * if (result.success) {
 *   console.log(result.value); // Type-safe access
 * } else {
 *   console.error(result.error); // Error message
 * }
 * ```
 */
export type StorageResult<T> =
    | { success: true; value: T }
    | { success: false; error: string };

// =============================================================================
// CONSTANTS
// =============================================================================

/** Prefix for all storage keys to avoid collisions */
const STORAGE_PREFIX = "chat-sdk";

/** Current schema version */
const CURRENT_VERSION = 1;

/** Known storage keys for type safety */
export const StorageKeys: {
    settings: StorageKey<null>;
    sidebarOpen: StorageKey<boolean>;
    draftInput: (chatId: string) => StorageKey<string>;
    selectedModel: StorageKey<string | undefined>;
    theme: StorageKey<"light" | "dark" | "system">;
} = {
    /** User settings (sampling, prompts, etc.) */
    settings: {
        key: "settings",
        defaultValue: null,
        version: 1,
    },
    /** Sidebar open/closed state */
    sidebarOpen: {
        key: "sidebar:open",
        defaultValue: true,
        version: 1,
    },
    /** Draft message input per chat */
    draftInput: (chatId: string): StorageKey<string> => ({
        key: `draft:${chatId}`,
        defaultValue: "",
        version: 1,
    }),
    /** Recently selected model */
    selectedModel: {
        key: "model:selected",
        defaultValue: undefined,
        version: 1,
    },
    /** Theme preference */
    theme: {
        key: "theme",
        defaultValue: "system",
        version: 1,
    },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Generate full storage key with prefix
 */
function getFullKey(key: string): string {
    return `${STORAGE_PREFIX}.${key}`;
}

/**
 * Safely parse JSON with error handling
 */
function safeJsonParse<T>(json: string): T | null {
    try {
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
}

// =============================================================================
// CORE API
// =============================================================================

/**
 * Get value from localStorage with type safety
 *
 * Note: This function provides compile-time type safety via generics,
 * but runtime type validation is the caller's responsibility.
 * For critical data, consider adding zod schema validation at the call site.
 *
 * @param config - Storage key configuration
 * @returns The stored value or default value
 *
 * @example
 * ```ts
 * const isOpen = storage.get(StorageKeys.sidebarOpen);
 * const draft = storage.get(StorageKeys.draftInput('chat-123'));
 * ```
 */
export function get<T>(config: StorageKey<T>): T {
    if (!isBrowser()) {
        return config.defaultValue;
    }

    try {
        const fullKey = getFullKey(config.key);
        const raw = localStorage.getItem(fullKey);

        if (raw === null) {
            return config.defaultValue;
        }

        const parsed = safeJsonParse<StoredItem<T>>(raw);

        if (!parsed || typeof parsed !== "object") {
            // Legacy format (raw value) - migrate
            const legacyValue = safeJsonParse<T>(raw);
            if (legacyValue !== null) {
                // Migrate to new format
                set(config, legacyValue);
                return legacyValue;
            }
            return config.defaultValue;
        }

        // Version check - if version mismatch, return default (could add migration logic)
        if (config.version && parsed.version !== config.version) {
            // Clear stale versioned data
            remove(config);
            return config.defaultValue;
        }

        return parsed.value;
    } catch {
        return config.defaultValue;
    }
}

/**
 * Set value in localStorage with type safety
 *
 * @param config - Storage key configuration
 * @param value - Value to store
 * @returns Result indicating success or failure
 *
 * @example
 * ```ts
 * storage.set(StorageKeys.sidebarOpen, false);
 * storage.set(StorageKeys.draftInput('chat-123'), 'Hello');
 * ```
 */
export function set<T>(config: StorageKey<T>, value: T): StorageResult<T> {
    if (!isBrowser()) {
        return { success: false, error: "Not in browser environment" };
    }

    try {
        const fullKey = getFullKey(config.key);
        const item: StoredItem<T> = {
            value,
            version: config.version ?? CURRENT_VERSION,
            updatedAt: Date.now(),
        };

        localStorage.setItem(fullKey, JSON.stringify(item));
        return { success: true, value };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: message };
    }
}

/**
 * Remove value from localStorage
 *
 * @param config - Storage key configuration
 * @returns true if removed, false otherwise
 *
 * @example
 * ```ts
 * storage.remove(StorageKeys.draftInput('chat-123'));
 * ```
 */
export function remove<T>(config: StorageKey<T>): boolean {
    if (!isBrowser()) {
        return false;
    }

    try {
        const fullKey = getFullKey(config.key);
        localStorage.removeItem(fullKey);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if a key exists in localStorage
 *
 * @param config - Storage key configuration
 * @returns true if key exists, false otherwise
 */
export function has<T>(config: StorageKey<T>): boolean {
    if (!isBrowser()) {
        return false;
    }

    try {
        const fullKey = getFullKey(config.key);
        return localStorage.getItem(fullKey) !== null;
    } catch {
        return false;
    }
}

/**
 * Clear all app-specific storage keys
 *
 * @returns Number of keys cleared
 *
 * @example
 * ```ts
 * // On logout, clear all app data
 * storage.clearAll();
 * ```
 */
export function clearAll(): number {
    if (!isBrowser()) {
        return 0;
    }

    try {
        const prefix = `${STORAGE_PREFIX}.`;
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }

        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }

        return keysToRemove.length;
    } catch {
        return 0;
    }
}

/**
 * Clear storage keys matching a pattern
 *
 * @param pattern - Key pattern to match (supports * wildcard at end)
 * @returns Number of keys cleared
 *
 * @example
 * ```ts
 * // Clear all drafts
 * storage.clearPattern('draft:*');
 * ```
 */
export function clearPattern(pattern: string): number {
    if (!isBrowser()) {
        return 0;
    }

    try {
        const prefix = `${STORAGE_PREFIX}.`;
        const isWildcard = pattern.endsWith("*");
        const searchPrefix = isWildcard
            ? prefix + pattern.slice(0, -1)
            : prefix + pattern;

        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                if (isWildcard && key.startsWith(searchPrefix)) {
                    keysToRemove.push(key);
                } else if (!isWildcard && key === searchPrefix) {
                    keysToRemove.push(key);
                }
            }
        }

        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }

        return keysToRemove.length;
    } catch {
        return 0;
    }
}

/**
 * Get all storage keys with their values (for debugging)
 *
 * @returns Map of keys to raw values
 */
export function getAll(): Map<string, unknown> {
    const result = new Map<string, unknown>();

    if (!isBrowser()) {
        return result;
    }

    try {
        const prefix = `${STORAGE_PREFIX}.`;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = safeJsonParse<StoredItem<unknown>>(raw);
                    const displayKey = key.slice(prefix.length);
                    result.set(displayKey, parsed?.value ?? raw);
                }
            }
        }
    } catch {
        // Ignore errors
    }

    return result;
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Storage namespace for clean imports
 *
 * @example
 * ```ts
 * import { storage, StorageKeys } from '@/lib/utils/storage';
 *
 * const isOpen = storage.get(StorageKeys.sidebarOpen);
 * storage.set(StorageKeys.sidebarOpen, false);
 * ```
 */
export const storage = {
    get,
    set,
    remove,
    has,
    clearAll,
    clearPattern,
    getAll,
} as const;
