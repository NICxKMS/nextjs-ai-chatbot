/**
 * Session Persistence Utilities
 *
 * Manages session-specific state persistence with:
 * - Automatic cleanup on logout
 * - Cross-tab synchronization
 * - Hydration helpers for SSR
 *
 * @module lib/utils/session-persistence
 */

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type StorageKey, StorageKeys, storage } from "./storage";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Listener for storage changes
 */
type StorageListener = () => void;

/**
 * Session state shape
 */
export type SessionState = {
    /** Currently selected model ID */
    selectedModelId: string | undefined;
    /** Sidebar open state */
    sidebarOpen: boolean;
    /** Theme preference */
    theme: "light" | "dark" | "system";
};

// =============================================================================
// CROSS-TAB SYNC
// =============================================================================

const listeners = new Set<StorageListener>();

/**
 * Subscribe to storage changes
 */
function subscribe(listener: StorageListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Notify all listeners of a change
 */
function emitChange(): void {
    for (const listener of listeners) {
        listener();
    }
}

// Listen for storage events from other tabs
if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
        // Only react to our prefixed keys
        if (event.key?.startsWith("chat-sdk.")) {
            emitChange();
        }
    });
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to persist and sync a single value across tabs
 *
 * @param config - Storage key configuration
 * @returns [value, setValue] tuple
 *
 * @example
 * ```tsx
 * function ModelSelector() {
 *   const [modelId, setModelId] = usePersistedState(StorageKeys.selectedModel);
 *   // ...
 * }
 * ```
 */
export function usePersistedState<T>(
    config: StorageKey<T>
): [T, (value: T) => void] {
    // Get current snapshot
    const getSnapshot = useCallback(() => {
        return storage.get(config);
    }, [config]);

    // Server snapshot always returns default
    const getServerSnapshot = useCallback(() => {
        return config.defaultValue;
    }, [config.defaultValue]);

    // Subscribe to changes
    const value = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    // Setter that updates storage and notifies listeners
    const setValue = useCallback(
        (newValue: T) => {
            storage.set(config, newValue);
            emitChange();
        },
        [config]
    );

    return [value, setValue];
}

/**
 * Hook to get persisted sidebar state with cross-tab sync
 *
 * @returns [isOpen, setIsOpen] tuple
 *
 * @example
 * ```tsx
 * function Sidebar() {
 *   const [isOpen, setIsOpen] = useSidebarPersistence();
 *   // Changes sync across tabs automatically
 * }
 * ```
 */
export function useSidebarPersistence(): [boolean, (isOpen: boolean) => void] {
    return usePersistedState(StorageKeys.sidebarOpen);
}

/**
 * Hook for draft input persistence per chat
 *
 * @param chatId - Chat ID to persist draft for
 * @returns [draft, setDraft, clearDraft] tuple
 *
 * @example
 * ```tsx
 * function ChatInput({ chatId }) {
 *   const [draft, setDraft, clearDraft] = useDraftPersistence(chatId);
 *
 *   const onSubmit = () => {
 *     sendMessage(draft);
 *     clearDraft();
 *   };
 * }
 * ```
 */
export function useDraftPersistence(
    chatId: string
): [string, (draft: string) => void, () => void] {
    const config = StorageKeys.draftInput(chatId);
    const [draft, setDraft] = usePersistedState(config);

    const clearDraft = useCallback(() => {
        storage.remove(config);
        emitChange();
    }, [config]);

    return [draft, setDraft, clearDraft];
}

/**
 * Hook to hydrate persisted state on client mount
 *
 * Use this at the app root to ensure all persisted state
 * is loaded before rendering dependent components.
 *
 * @example
 * ```tsx
 * function App() {
 *   const isHydrated = useSessionHydration();
 *
 *   if (!isHydrated) return <Loading />;
 *   return <MainContent />;
 * }
 * ```
 */
export function useSessionHydration(): boolean {
    const getSnapshot = useCallback(() => true, []);
    const getServerSnapshot = useCallback(() => false, []);

    return useSyncExternalStore(
        // No-op subscribe since this is one-time
        () => () => {},
        getSnapshot,
        getServerSnapshot
    );
}

/**
 * Hook to clear all session-specific data
 *
 * @returns clearSession function
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const clearSession = useClearSession();
 *
 *   const handleLogout = async () => {
 *     await signOut();
 *     clearSession();
 *   };
 * }
 * ```
 */
export function useClearSession(): () => void {
    return useCallback(() => {
        storage.clearAll();
        emitChange();
    }, []);
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Sync state changes to localStorage (for Zustand middleware)
 *
 * @param key - Storage key
 * @param state - State to persist
 */
export function persistState<T>(key: string, state: T): void {
    storage.set({ key, defaultValue: state }, state);
    emitChange();
}

/**
 * Load persisted state (for Zustand rehydration)
 *
 * @param key - Storage key
 * @param defaultValue - Default if not found
 * @returns Persisted state or default
 */
export function loadPersistedState<T>(key: string, defaultValue: T): T {
    return storage.get({ key, defaultValue });
}
