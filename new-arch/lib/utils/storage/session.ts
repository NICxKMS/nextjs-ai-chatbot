/**
 * Gets an item from sessionStorage, parsing it as JSON.
 * Returns the fallback value on the server or if parsing fails.
 *
 * @param key - The sessionStorage key
 * @param fallback - The fallback value if key doesn't exist or parsing fails
 * @returns The stored value or fallback
 *
 * @example
 * const step = getSessionItem<number>('wizard-step', 0);
 */
export function getSessionItem<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") {
        return fallback;
    }

    try {
        const item = sessionStorage.getItem(key);
        return item !== null ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Sets an item in sessionStorage, serializing it as JSON.
 * No-op on the server.
 *
 * @param key - The sessionStorage key
 * @param value - The value to store
 *
 * @example
 * setSessionItem('wizard-data', { currentStep: 2, data: formData });
 */
export function setSessionItem<T>(key: string, value: T): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to set sessionStorage item "${key}":`, error);
    }
}

/**
 * Removes an item from sessionStorage.
 * No-op on the server.
 *
 * @param key - The sessionStorage key to remove
 *
 * @example
 * removeSessionItem('wizard-data');
 */
export function removeSessionItem(key: string): void {
    if (typeof window === "undefined") {
        return;
    }
    sessionStorage.removeItem(key);
}

/**
 * Checks if a key exists in sessionStorage.
 *
 * @param key - The sessionStorage key to check
 * @returns True if the key exists
 *
 * @example
 * if (hasSessionItem('wizard-data')) { ... }
 */
export function hasSessionItem(key: string): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    return sessionStorage.getItem(key) !== null;
}

/**
 * Gets all keys in sessionStorage.
 *
 * @returns Array of all sessionStorage keys
 *
 * @example
 * const keys = getSessionKeys();
 */
export function getSessionKeys(): string[] {
    if (typeof window === "undefined") {
        return [];
    }
    return Object.keys(sessionStorage);
}

/**
 * Clears all items from sessionStorage.
 * Use with caution.
 *
 * @example
 * clearSession();
 */
export function clearSession(): void {
    if (typeof window === "undefined") {
        return;
    }
    sessionStorage.clear();
}
