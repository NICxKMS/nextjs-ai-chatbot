"use client";

/**
 * Connection Status Component
 *
 * Visual indicator showing network connection state.
 *
 * @module shared/components/connection-status
 */

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { UseNetworkStatusOptions } from "../hooks/use-network-status";
import { useNetworkStatus } from "../hooks/use-network-status";

// =============================================================================
// TYPES
// =============================================================================

export interface ConnectionStatusProps {
    /** CSS class name */
    className?: string;
    /** Whether to show the banner when online (default: false) */
    showWhenOnline?: boolean;
    /** Position of the banner (default: "top") */
    position?: "top" | "bottom";
    /** Network status options */
    networkOptions?: UseNetworkStatusOptions;
    /** Custom message when offline */
    offlineMessage?: string;
    /** Custom message when reconnecting */
    reconnectingMessage?: string;
    /** Custom message when back online */
    onlineMessage?: string;
    /** Duration to show "back online" message in ms (default: 3000) */
    onlineDuration?: number;
}

type ConnectionState = "online" | "offline" | "reconnecting";

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const bannerVariants = {
    hidden: (position: "top" | "bottom") => ({
        y: position === "top" ? -100 : 100,
        opacity: 0,
    }),
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 30,
        },
    },
    exit: (position: "top" | "bottom") => ({
        y: position === "top" ? -100 : 100,
        opacity: 0,
        transition: {
            duration: 0.2,
        },
    }),
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Connection status banner that shows when offline/reconnecting.
 *
 * Features:
 * - Automatic show/hide based on network status
 * - Animated transitions
 * - Customizable messages and position
 * - Brief "back online" notification
 *
 * @example
 * ```tsx
 * // Basic usage - shows banner when offline
 * <ConnectionStatus />
 *
 * // With custom messages
 * <ConnectionStatus
 *   offlineMessage="No internet connection"
 *   reconnectingMessage="Reconnecting..."
 *   position="bottom"
 * />
 *
 * // In layout
 * export default function Layout({ children }) {
 *   return (
 *     <div>
 *       <ConnectionStatus />
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function ConnectionStatus({
    className,
    showWhenOnline = false,
    position = "top",
    networkOptions,
    offlineMessage = "You are offline",
    reconnectingMessage = "Reconnecting...",
    onlineMessage = "Back online!",
    onlineDuration = 3000,
}: ConnectionStatusProps) {
    const { isOnline, isConnected, checkConnection } =
        useNetworkStatus(networkOptions);
    const [connectionState, setConnectionState] =
        useState<ConnectionState>("online");
    const [showOnlineMessage, setShowOnlineMessage] = useState(false);
    const [wasOffline, setWasOffline] = useState(false);

    // Track connection state changes
    useEffect(() => {
        if (!isOnline) {
            setConnectionState("offline");
            setWasOffline(true);
        } else if (isOnline && !isConnected && networkOptions?.enablePing) {
            setConnectionState("reconnecting");
        } else {
            // Show "back online" briefly if we were offline
            if (wasOffline) {
                setShowOnlineMessage(true);
                setWasOffline(false);

                const timer = setTimeout(() => {
                    setShowOnlineMessage(false);
                }, onlineDuration);

                return () => clearTimeout(timer);
            }
            setConnectionState("online");
        }
    }, [
        isOnline,
        isConnected,
        networkOptions?.enablePing,
        wasOffline,
        onlineDuration,
    ]);

    // Determine if banner should be visible
    const shouldShow =
        connectionState === "offline" ||
        connectionState === "reconnecting" ||
        showOnlineMessage ||
        (showWhenOnline && connectionState === "online");

    // Get current message and styles
    const getMessage = () => {
        if (showOnlineMessage) {
            return onlineMessage;
        }
        if (connectionState === "offline") {
            return offlineMessage;
        }
        if (connectionState === "reconnecting") {
            return reconnectingMessage;
        }
        return "";
    };

    const getStyles = () => {
        if (showOnlineMessage) {
            return "bg-emerald-600 text-white";
        }
        if (connectionState === "offline") {
            return "bg-red-600 text-white";
        }
        if (connectionState === "reconnecting") {
            return "bg-amber-500 text-black";
        }
        return "bg-emerald-600 text-white";
    };

    return (
        <AnimatePresence mode="wait">
            {shouldShow && (
                <motion.div
                    animate="visible"
                    className={cn(
                        "fixed right-0 left-0 z-50 flex items-center justify-center gap-2 px-4 py-2 font-medium text-sm",
                        position === "top" ? "top-0" : "bottom-0",
                        getStyles(),
                        className
                    )}
                    custom={position}
                    exit="exit"
                    initial="hidden"
                    key="connection-status"
                    variants={bannerVariants}
                >
                    {/* Status indicator */}
                    <span className="relative flex h-2 w-2">
                        {connectionState === "reconnecting" && (
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
                        )}
                        <span
                            className={cn(
                                "relative inline-flex h-2 w-2 rounded-full",
                                showOnlineMessage
                                    ? "bg-white"
                                    : connectionState === "offline"
                                      ? "bg-white"
                                      : connectionState === "reconnecting"
                                        ? "bg-black"
                                        : "bg-white"
                            )}
                        />
                    </span>

                    {/* Message */}
                    <span>{getMessage()}</span>

                    {/* Retry button for offline state */}
                    {connectionState === "offline" && (
                        <button
                            className="ml-2 rounded-md bg-white/20 px-2 py-0.5 text-xs transition-colors hover:bg-white/30"
                            onClick={() => checkConnection()}
                            type="button"
                        >
                            Retry
                        </button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Minimal connection dot indicator.
 *
 * Shows a small colored dot indicating connection status.
 * Suitable for use in headers or toolbars.
 *
 * @example
 * ```tsx
 * <header className="flex items-center gap-2">
 *   <Logo />
 *   <ConnectionDot />
 * </header>
 * ```
 */
export function ConnectionDot({
    className,
    networkOptions,
}: {
    className?: string;
    networkOptions?: UseNetworkStatusOptions;
}) {
    const { isOnline, isConnected } = useNetworkStatus(networkOptions);

    const getColor = () => {
        if (!isOnline) {
            return "bg-red-500";
        }
        if (!isConnected && networkOptions?.enablePing) {
            return "bg-amber-500";
        }
        return "bg-emerald-500";
    };

    const getTitle = () => {
        if (!isOnline) {
            return "Offline";
        }
        if (!isConnected && networkOptions?.enablePing) {
            return "Reconnecting";
        }
        return "Connected";
    };

    return (
        <span
            aria-label={getTitle()}
            className={cn("relative flex h-2 w-2", className)}
            title={getTitle()}
        >
            {!isOnline || (!isConnected && networkOptions?.enablePing) ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
            ) : null}
            <span
                className={cn(
                    "relative inline-flex h-2 w-2 rounded-full transition-colors",
                    getColor()
                )}
            />
        </span>
    );
}
