/**
 * Gets an item from localStorage, parsing it as JSON.
 * Returns the fallback value on the server or if parsing fails.
 *
 * @param key - The localStorage key
 * @param fallback - The fallback value if key doesn't exist or parsing fails
 * @returns The stored value or fallback
 *
 * @example
 * const theme = getItem<'light' | 'dark'>('theme', 'light');
 */
export function getItem<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") {
        return fallback;
    }

    try {
        const item = localStorage.getItem(key);
        return item !== null ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Sets an item in localStorage, serializing it as JSON.
 * No-op on the server.
 *
 * @param key - The localStorage key
 * @param value - The value to store
 *
 * @example
 * setItem('user', { name: 'John', id: 123 });
 */
export function setItem<T>(key: string, value: T): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to set localStorage item "${key}":`, error);
    }
}

/**
 * Removes an item from localStorage.
 * No-op on the server.
 *
 * @param key - The localStorage key to remove
 *
 * @example
 * removeItem('user');
 */
export function removeItem(key: string): void {
    if (typeof window === "undefined") {
        return;
    }
    localStorage.removeItem(key);
}

/**
 * Checks if a key exists in localStorage.
 *
 * @param key - The localStorage key to check
 * @returns True if the key exists
 *
 * @example
 * if (hasItem('user')) { ... }
 */
export function hasItem(key: string): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    return localStorage.getItem(key) !== null;
}

/**
 * Gets all keys in localStorage.
 *
 * @returns Array of all localStorage keys
 *
 * @example
 * const keys = getKeys();
 */
export function getKeys(): string[] {
    if (typeof window === "undefined") {
        return [];
    }
    return Object.keys(localStorage);
}

/**
 * Clears all items from localStorage.
 * Use with caution.
 *
 * @example
 * clearAll();
 */
export function clearAll(): void {
    if (typeof window === "undefined") {
        return;
    }
    localStorage.clear();
}
