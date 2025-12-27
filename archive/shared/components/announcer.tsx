/**
 * Announcer Component
 *
 * Provides screen reader announcements for dynamic content changes.
 * Uses aria-live regions to notify assistive technology users
 * of important state changes without interrupting their flow.
 *
 * @module shared/components/announcer
 */

"use client";

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Politeness level for announcements.
 * - "polite": Waits for user to finish current activity (default)
 * - "assertive": Interrupts immediately (use sparingly)
 */
export type AnnouncementPoliteness = "polite" | "assertive";

/**
 * Announcement message with optional politeness level.
 */
export interface Announcement {
    message: string;
    politeness?: AnnouncementPoliteness;
}

/**
 * Context value for the announcer.
 */
export interface AnnouncerContextValue {
    /** Announce a message to screen readers */
    announce: (message: string, politeness?: AnnouncementPoliteness) => void;
    /** Announce when a message is sent */
    announceMessageSent: () => void;
    /** Announce when a response is received */
    announceMessageReceived: () => void;
    /** Announce loading/streaming state */
    announceLoading: (isLoading: boolean) => void;
    /** Announce an error */
    announceError: (error: string) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the announcer context.
 *
 * @throws Error if used outside AnnouncerProvider
 *
 * @example
 * ```tsx
 * const { announce, announceMessageSent } = useAnnouncer();
 *
 * const handleSubmit = () => {
 *   sendMessage();
 *   announceMessageSent();
 * };
 * ```
 */
export function useAnnouncer(): AnnouncerContextValue {
    const context = useContext(AnnouncerContext);
    if (!context) {
        throw new Error("useAnnouncer must be used within AnnouncerProvider");
    }
    return context;
}

/**
 * Safe version of useAnnouncer that returns null if not within provider.
 * Useful for components that may be rendered outside the provider.
 */
export function useAnnouncerSafe(): AnnouncerContextValue | null {
    return useContext(AnnouncerContext);
}

// =============================================================================
// PROVIDER
// =============================================================================

export interface AnnouncerProviderProps {
    children: ReactNode;
}

/**
 * Provides announcement capabilities to the component tree.
 *
 * Renders two hidden live regions:
 * - One for polite announcements (waits for user pause)
 * - One for assertive announcements (interrupts immediately)
 *
 * @example
 * ```tsx
 * <AnnouncerProvider>
 *   <App />
 * </AnnouncerProvider>
 * ```
 */
export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
    const [politeMessage, setPoliteMessage] = useState("");
    const [assertiveMessage, setAssertiveMessage] = useState("");

    const announce = useCallback(
        (message: string, politeness: AnnouncementPoliteness = "polite") => {
            // Clear first to ensure re-announcement of same message
            if (politeness === "assertive") {
                setAssertiveMessage("");
                // Use setTimeout to ensure the clear is processed
                setTimeout(() => setAssertiveMessage(message), 50);
            } else {
                setPoliteMessage("");
                setTimeout(() => setPoliteMessage(message), 50);
            }
        },
        []
    );

    const announceMessageSent = useCallback(() => {
        announce("Message sent. Waiting for response.");
    }, [announce]);

    const announceMessageReceived = useCallback(() => {
        announce("Response received.");
    }, [announce]);

    const announceLoading = useCallback(
        (isLoading: boolean) => {
            if (isLoading) {
                announce("Loading response...");
            } else {
                announce("Response complete.");
            }
        },
        [announce]
    );

    const announceError = useCallback(
        (error: string) => {
            announce(`Error: ${error}`, "assertive");
        },
        [announce]
    );

    const value = useMemo<AnnouncerContextValue>(
        () => ({
            announce,
            announceMessageSent,
            announceMessageReceived,
            announceLoading,
            announceError,
        }),
        [
            announce,
            announceMessageSent,
            announceMessageReceived,
            announceLoading,
            announceError,
        ]
    );

    return (
        <AnnouncerContext.Provider value={value}>
            {children}
            {/* Polite live region - waits for user pause */}
            <div
                aria-atomic="true"
                aria-live="polite"
                className="sr-only"
                role="status"
            >
                {politeMessage}
            </div>
            {/* Assertive live region - interrupts immediately */}
            <div
                aria-atomic="true"
                aria-live="assertive"
                className="sr-only"
                role="alert"
            >
                {assertiveMessage}
            </div>
        </AnnouncerContext.Provider>
    );
}

// =============================================================================
// STANDALONE COMPONENT
// =============================================================================

export interface LiveRegionProps {
    /** Content to announce */
    children: ReactNode;
    /** Politeness level */
    politeness?: AnnouncementPoliteness;
    /** Whether to use role="alert" (for errors) or role="status" */
    role?: "status" | "alert";
}

/**
 * Standalone live region component for inline announcements.
 *
 * @example
 * ```tsx
 * <LiveRegion politeness="polite">
 *   {status === 'loading' && 'Loading...'}
 * </LiveRegion>
 * ```
 */
export function LiveRegion({
    children,
    politeness = "polite",
    role = "status",
}: LiveRegionProps) {
    return (
        <div
            aria-atomic="true"
            aria-live={politeness}
            className="sr-only"
            role={role}
        >
            {children}
        </div>
    );
}
