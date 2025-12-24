/**
 * Session Synchronization via BroadcastChannel
 * Ref: REQ-030 Multi-Tab Session Synchronization
 *
 * Synchronizes authentication state across browser tabs to prevent
 * race conditions when guest users sign in from one tab.
 *
 * @module lib/auth/session-sync
 */

"use client";

import { useEffect, useRef } from "react";

// ============================================================================
// Types
// ============================================================================

/**
 * Messages broadcast between tabs for session synchronization
 */
export type SessionMessage =
    | { type: "session-change"; isAuthenticated: boolean; userId?: string }
    | { type: "session-refresh-requested" }
    | { type: "logout" };

/**
 * Options for session sync configuration
 */
export interface SessionSyncOptions {
    /** Custom channel name (default: 'auth-session-sync') */
    channelName?: string;
    /** Callback when session state changes in another tab */
    onSessionChange?: (isAuthenticated: boolean, userId?: string) => void;
    /** Callback when logout occurs in another tab */
    onLogout?: () => void;
    /** Callback when a refresh is requested from another tab */
    onRefreshRequested?: () => void;
}

/**
 * Session sync instance returned by createSessionSync
 */
export interface SessionSyncInstance {
    /** Broadcast login event to other tabs */
    broadcastLogin: (userId: string) => void;
    /** Broadcast logout event to other tabs */
    broadcastLogout: () => void;
    /** Request other tabs to refresh their session state */
    requestRefresh: () => void;
    /** Clean up the broadcast channel */
    destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CHANNEL_NAME = "auth-session-sync";

// ============================================================================
// SSR Safety Guards
// ============================================================================

/**
 * Check if BroadcastChannel is available in the current environment
 */
function isBroadcastChannelSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "BroadcastChannel" in window &&
        typeof BroadcastChannel !== "undefined"
    );
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a session sync instance for cross-tab authentication synchronization.
 *
 * @example
 * ```typescript
 * const sync = createSessionSync({
 *   onSessionChange: (isAuth, userId) => {
 *     if (isAuth) router.refresh();
 *   },
 *   onLogout: () => {
 *     router.push('/login');
 *   }
 * });
 *
 * // On successful login
 * sync.broadcastLogin(user.id);
 *
 * // On logout
 * sync.broadcastLogout();
 *
 * // Cleanup
 * sync.destroy();
 * ```
 *
 * @param options - Configuration options
 * @returns Session sync instance with broadcast methods
 */
export function createSessionSync(
    options: SessionSyncOptions = {}
): SessionSyncInstance {
    const {
        channelName = DEFAULT_CHANNEL_NAME,
        onSessionChange,
        onLogout,
        onRefreshRequested,
    } = options;

    // Return no-op instance if BroadcastChannel is not supported
    if (!isBroadcastChannelSupported()) {
        return {
            broadcastLogin: () => {},
            broadcastLogout: () => {},
            requestRefresh: () => {},
            destroy: () => {},
        };
    }

    let channel: BroadcastChannel | null = new BroadcastChannel(channelName);

    // Handle incoming messages from other tabs
    const handleMessage = (event: MessageEvent<SessionMessage>) => {
        const message = event.data;

        switch (message.type) {
            case "session-change":
                onSessionChange?.(message.isAuthenticated, message.userId);
                break;
            case "logout":
                onLogout?.();
                break;
            case "session-refresh-requested":
                onRefreshRequested?.();
                break;
        }
    };

    channel.addEventListener("message", handleMessage);

    return {
        broadcastLogin(userId: string): void {
            if (!channel) { return; }
            const message: SessionMessage = {
                type: "session-change",
                isAuthenticated: true,
                userId,
            };
            channel.postMessage(message);
        },

        broadcastLogout(): void {
            if (!channel) { return; }
            // Send both logout and session-change for flexibility
            const logoutMessage: SessionMessage = { type: "logout" };
            const sessionMessage: SessionMessage = {
                type: "session-change",
                isAuthenticated: false,
            };
            channel.postMessage(logoutMessage);
            channel.postMessage(sessionMessage);
        },

        requestRefresh(): void {
            if (!channel) { return; }
            const message: SessionMessage = { type: "session-refresh-requested" };
            channel.postMessage(message);
        },

        destroy(): void {
            if (channel) {
                channel.removeEventListener("message", handleMessage);
                channel.close();
                channel = null;
            }
        },
    };
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for session synchronization across browser tabs.
 *
 * Sets up a BroadcastChannel listener that automatically cleans up on unmount.
 * Use this in layout components that need to react to session changes.
 *
 * @example
 * ```typescript
 * function RootLayout({ children }) {
 *   const router = useRouter();
 *
 *   useSessionSync({
 *     onSessionChange: (isAuthenticated, userId) => {
 *       // Refresh to get new session state
 *       router.refresh();
 *     },
 *     onLogout: () => {
 *       // Redirect to login
 *       router.push('/login');
 *     }
 *   });
 *
 *   return <>{children}</>;
 * }
 * ```
 *
 * @param options - Configuration options for session sync
 */
export function useSessionSync(options: SessionSyncOptions = {}): void {
    const syncRef = useRef<SessionSyncInstance | null>(null);

    // Store options in ref to avoid re-creating on every render
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        // Create sync instance with current options
        syncRef.current = createSessionSync({
            channelName: optionsRef.current.channelName,
            onSessionChange: (isAuthenticated, userId) => {
                optionsRef.current.onSessionChange?.(isAuthenticated, userId);
            },
            onLogout: () => {
                optionsRef.current.onLogout?.();
            },
            onRefreshRequested: () => {
                optionsRef.current.onRefreshRequested?.();
            },
        });

        // Cleanup on unmount
        return () => {
            syncRef.current?.destroy();
            syncRef.current = null;
        };
    }, []);
}

/**
 * React hook that returns a session sync instance for imperative broadcasts.
 *
 * Use this when you need to broadcast events from within a component.
 *
 * @example
 * ```typescript
 * function LoginButton() {
 *   const sessionSync = useSessionSyncBroadcast();
 *
 *   const handleLogin = async () => {
 *     const user = await signIn();
 *     sessionSync.broadcastLogin(user.id);
 *   };
 *
 *   return <button onClick={handleLogin}>Sign In</button>;
 * }
 * ```
 *
 * @param channelName - Optional custom channel name
 * @returns Session sync instance with broadcast methods
 */
export function useSessionSyncBroadcast(
    channelName?: string
): SessionSyncInstance {
    const syncRef = useRef<SessionSyncInstance | null>(null);

    useEffect(() => {
        syncRef.current = createSessionSync({ channelName });

        return () => {
            syncRef.current?.destroy();
            syncRef.current = null;
        };
    }, [channelName]);

    // Return stable no-op functions that delegate to ref
    // This ensures consistent return value even before effect runs
    return {
        broadcastLogin: (userId: string) => syncRef.current?.broadcastLogin(userId),
        broadcastLogout: () => syncRef.current?.broadcastLogout(),
        requestRefresh: () => syncRef.current?.requestRefresh(),
        destroy: () => syncRef.current?.destroy(),
    };
}
