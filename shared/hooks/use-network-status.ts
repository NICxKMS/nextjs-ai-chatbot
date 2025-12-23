"use client";

/**
 * Network Status Hook
 *
 * Provides real-time online/offline detection with event-driven updates.
 *
 * @module shared/hooks/use-network-status
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface NetworkStatus {
    /** Whether the browser is online */
    isOnline: boolean;
    /** Whether we've confirmed server connectivity (optional ping check) */
    isConnected: boolean;
    /** Time of last status change */
    lastChanged: Date | null;
    /** Whether the status has been checked at least once */
    isInitialized: boolean;
}

export interface UseNetworkStatusOptions {
    /** Enable server ping to verify actual connectivity (default: false) */
    enablePing?: boolean;
    /** Ping endpoint URL (default: '/api/health') */
    pingEndpoint?: string;
    /** Ping interval in ms (default: 30000) */
    pingInterval?: number;
    /** Callback when going online */
    onOnline?: () => void;
    /** Callback when going offline */
    onOffline?: () => void;
}

export interface UseNetworkStatusReturn extends NetworkStatus {
    /** Manually trigger a connectivity check */
    checkConnection: () => Promise<boolean>;
}

// =============================================================================
// STORE (External store for useSyncExternalStore)
// =============================================================================

type Listener = () => void;

let networkStatus: NetworkStatus = {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isConnected: typeof navigator !== "undefined" ? navigator.onLine : true,
    lastChanged: null,
    isInitialized: false,
};

const listeners = new Set<Listener>();

function emitChange() {
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot(): NetworkStatus {
    return networkStatus;
}

function getServerSnapshot(): NetworkStatus {
    // Server-side: assume online
    return {
        isOnline: true,
        isConnected: true,
        lastChanged: null,
        isInitialized: true,
    };
}

function setOnline(isOnline: boolean, isConnected?: boolean) {
    networkStatus = {
        isOnline,
        isConnected: isConnected ?? isOnline,
        lastChanged: new Date(),
        isInitialized: true,
    };
    emitChange();
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for detecting network online/offline status.
 *
 * Features:
 * - Real-time online/offline detection via browser events
 * - Optional server ping for actual connectivity verification
 * - SSR-safe with useSyncExternalStore
 * - Callbacks for status changes
 *
 * @param options - Configuration options
 * @returns Network status and utilities
 *
 * @example
 * ```tsx
 * const { isOnline, isConnected, checkConnection } = useNetworkStatus({
 *   enablePing: true,
 *   onOffline: () => toast.error('You are offline'),
 *   onOnline: () => toast.success('Back online!'),
 * });
 *
 * if (!isOnline) {
 *   return <OfflineBanner />;
 * }
 * ```
 */
export function useNetworkStatus(
    options: UseNetworkStatusOptions = {}
): UseNetworkStatusReturn {
    const {
        enablePing = false,
        pingEndpoint = "/api/health",
        pingInterval = 30_000,
        onOnline,
        onOffline,
    } = options;

    const status = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    // Check server connectivity
    const checkConnection = useCallback(async (): Promise<boolean> => {
        if (!navigator.onLine) {
            setOnline(false, false);
            return false;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(pingEndpoint, {
                method: "HEAD",
                cache: "no-store",
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const isConnected = response.ok;
            setOnline(true, isConnected);
            return isConnected;
        } catch {
            // Network error or timeout - we're online but can't reach server
            setOnline(navigator.onLine, false);
            return false;
        }
    }, [pingEndpoint]);

    // Setup browser event listeners
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const handleOnline = () => {
            setOnline(true);
            onOnline?.();
            // Verify actual connectivity when coming back online
            if (enablePing) {
                checkConnection();
            }
        };

        const handleOffline = () => {
            setOnline(false, false);
            onOffline?.();
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Initialize status
        if (!status.isInitialized) {
            setOnline(navigator.onLine);
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [
        enablePing,
        checkConnection,
        onOnline,
        onOffline,
        status.isInitialized,
    ]);

    // Optional periodic ping
    useEffect(() => {
        if (!enablePing || typeof window === "undefined") {
            return;
        }

        // Initial check
        checkConnection();

        const intervalId = setInterval(checkConnection, pingInterval);

        return () => clearInterval(intervalId);
    }, [enablePing, pingInterval, checkConnection]);

    return {
        ...status,
        checkConnection,
    };
}

/**
 * Simple hook that returns just the online status boolean.
 * Lighter weight alternative when you only need online/offline state.
 */
export function useIsOnline(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().isOnline,
        () => true
    );
}
