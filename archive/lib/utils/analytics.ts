/**
 * Analytics Tracking Utility
 * Stub implementation for analytics event tracking
 *
 * @module lib/utils/analytics
 */

export type EventCategory =
    | "chat"
    | "auth"
    | "navigation"
    | "error"
    | "performance"
    | "feature"
    | "user";

export interface AnalyticsEvent {
    category: EventCategory;
    action: string;
    label?: string;
    value?: number;
    metadata?: Record<string, unknown>;
}

export interface TimingEvent {
    category: string;
    variable: string;
    duration: number;
    label?: string;
}

export interface UserProperties {
    userId?: string;
    sessionId?: string;
    [key: string]: unknown;
}

// Check if analytics is enabled (stub - always false in development)
const isAnalyticsEnabled = (): boolean => {
    if (typeof window === "undefined") {
        return false;
    }
    return process.env.NODE_ENV === "production";
};

// Store for user properties
let userProperties: UserProperties = {};

/**
 * Analytics tracking interface
 *
 * @example
 * ```typescript
 * import { analytics } from "@/lib/utils/analytics";
 *
 * // Track an event
 * analytics.track({
 *   category: "chat",
 *   action: "message_sent",
 *   metadata: { messageLength: 150 }
 * });
 *
 * // Track timing
 * const stopTiming = analytics.startTiming("chat", "response_time");
 * // ... do work
 * stopTiming();
 *
 * // Track page view
 * analytics.pageView("/chat/123");
 * ```
 */
export const analytics = {
    /**
     * Track a custom event
     */
    track(event: AnalyticsEvent): void {
        if (!isAnalyticsEnabled()) {
            if (process.env.NODE_ENV === "development") {
                console.debug("[Analytics] Event:", event);
            }
            return;
        }

        // Production: send to analytics service
        // This is a stub - implement with your analytics provider
        // Example: window.gtag?.('event', event.action, { ... })
    },

    /**
     * Track a page view
     */
    pageView(path: string, title?: string): void {
        if (!isAnalyticsEnabled()) {
            if (process.env.NODE_ENV === "development") {
                console.debug("[Analytics] Page View:", { path, title });
            }
            return;
        }

        // Production: send to analytics service
        // Example: window.gtag?.('config', GA_ID, { page_path: path })
    },

    /**
     * Track a timing event
     */
    timing(event: TimingEvent): void {
        if (!isAnalyticsEnabled()) {
            if (process.env.NODE_ENV === "development") {
                console.debug("[Analytics] Timing:", event);
            }
            return;
        }

        // Production: send to analytics service
    },

    /**
     * Start timing and return a function to stop it
     */
    startTiming(
        category: string,
        variable: string,
        label?: string
    ): () => number {
        const start = performance.now();

        return () => {
            const duration = Math.round(performance.now() - start);
            this.timing({ category, variable, duration, label });
            return duration;
        };
    },

    /**
     * Set user properties for all subsequent events
     */
    setUser(properties: UserProperties): void {
        userProperties = { ...userProperties, ...properties };

        if (!isAnalyticsEnabled()) {
            if (process.env.NODE_ENV === "development") {
                console.debug("[Analytics] User Properties:", userProperties);
            }
            return;
        }

        // Production: set user properties in analytics service
    },

    /**
     * Clear user properties (e.g., on logout)
     */
    clearUser(): void {
        userProperties = {};

        if (process.env.NODE_ENV === "development") {
            console.debug("[Analytics] User cleared");
        }
    },

    /**
     * Get current user properties
     */
    getUser(): UserProperties {
        return { ...userProperties };
    },

    /**
     * Track an error event
     */
    trackError(error: Error, context?: Record<string, unknown>): void {
        this.track({
            category: "error",
            action: error.name,
            label: error.message,
            metadata: {
                stack: error.stack?.slice(0, 500),
                ...context,
            },
        });
    },

    /**
     * Track feature usage
     */
    trackFeature(featureName: string, enabled: boolean): void {
        this.track({
            category: "feature",
            action: enabled ? "enabled" : "disabled",
            label: featureName,
        });
    },
};

// Convenience functions for common events
export const trackChatEvent = (
    action: string,
    metadata?: Record<string, unknown>
): void => {
    analytics.track({ category: "chat", action, metadata });
};

export const trackAuthEvent = (
    action: string,
    metadata?: Record<string, unknown>
): void => {
    analytics.track({ category: "auth", action, metadata });
};

export const trackPerformance = (
    action: string,
    duration: number,
    metadata?: Record<string, unknown>
): void => {
    analytics.track({
        category: "performance",
        action,
        value: duration,
        metadata,
    });
};

export default analytics;
