import "server-only";

/**
 * ==============================================================================
 * NEW RELIC AGENT - SHARED MODULE
 * ==============================================================================
 *
 * Centralized New Relic agent access with:
 * - Server-side only execution
 * - Caching to avoid repeated require() calls
 * - Dynamic require to bypass Webpack static analysis
 * - Type-safe API wrappers
 * - Silent failure for all operations (monitoring shouldn't break the app)
 *
 * Usage:
 * ```typescript
 * import {
 *     getNewRelicAgent,
 *     recordEvent,
 *     recordMetric,
 *     addAttribute,
 *     noticeError,
 *     hasActiveTransaction
 * } from '@/lib/monitoring/newrelic-agent';
 *
 * // Record custom event
 * recordEvent('UserAction', { action: 'login', userId: '123' });
 *
 * // Record metric
 * recordMetric('Custom/API/ResponseTime', 150);
 *
 * // Add transaction attribute (only if transaction active)
 * addAttribute('user.id', '123');
 *
 * // Report error
 * noticeError(new Error('Something failed'), { context: 'api' });
 * ```
 */

// Type definitions for New Relic agent
export type NewRelicTransaction = {
    isActive?: () => boolean;
};

export type NewRelicAgent = {
    recordCustomEvent: (
        eventType: string,
        attributes: Record<string, unknown>
    ) => void;
    recordMetric: (name: string, value: number) => void;
    addCustomAttribute: (key: string, value: unknown) => void;
    noticeError: (
        error: Error,
        customAttributes?: Record<string, unknown>
    ) => void;
    getTransaction?: () => NewRelicTransaction | null;
};

// Cached agent reference (server-side only)
let cachedAgent: NewRelicAgent | null | undefined;
let loadAttempted = false;
let agentLoadError: string | null = null;

/**
 * Get New Relic agent instance (server-side only)
 *
 * Features:
 * - Uses caching to avoid repeated require() calls
 * - Uses dynamic require via Function constructor to bypass Webpack static analysis
 * - Returns null on client-side or if New Relic unavailable
 *
 * @returns New Relic agent or null
 */
export function getNewRelicAgent(): NewRelicAgent | null {
    // Only run on server
    if (typeof window !== "undefined") {
        return null;
    }

    // Return cached reference if already loaded
    if (loadAttempted) {
        return cachedAgent ?? null;
    }

    loadAttempted = true;

    // Check if license key is configured
    if (
        !process.env.NEW_RELIC_LICENSE_KEY ||
        process.env.NEW_RELIC_LICENSE_KEY.length === 0
    ) {
        agentLoadError = "NEW_RELIC_LICENSE_KEY not configured";
        return null;
    }

    try {
        // Use Function constructor to create a dynamic require that Webpack won't analyze
        // This prevents bundling Node.js modules for client-side
        cachedAgent = new Function(
            'return typeof require !== "undefined" ? require("newrelic") : null'
        )() as NewRelicAgent | null;

        if (cachedAgent) {
            // Verify the agent has the expected methods
            if (typeof cachedAgent.recordCustomEvent !== "function") {
                agentLoadError =
                    "Agent loaded but missing recordCustomEvent method";
                cachedAgent = null;
            }
        } else {
            agentLoadError = "require('newrelic') returned null";
        }
    } catch (error) {
        agentLoadError =
            error instanceof Error
                ? error.message
                : "Unknown error loading agent";
        cachedAgent = null;
    }

    return cachedAgent ?? null;
}

/**
 * Check if New Relic agent is available and configured
 * Useful for debugging connectivity issues
 */
export function getAgentStatus(): {
    available: boolean;
    error: string | null;
    licenseKeySet: boolean;
    appName: string | null;
} {
    // Trigger load attempt if not done
    getNewRelicAgent();

    return {
        available: cachedAgent !== null && cachedAgent !== undefined,
        error: agentLoadError,
        licenseKeySet: Boolean(
            process.env.NEW_RELIC_LICENSE_KEY &&
                process.env.NEW_RELIC_LICENSE_KEY.length > 0
        ),
        appName: process.env.NEW_RELIC_APP_NAME ?? null,
    };
}

/**
 * Check if there's an active New Relic transaction
 *
 * @returns true if a transaction is active, false otherwise
 */
export function hasActiveTransaction(): boolean {
    const agent = getNewRelicAgent();
    if (!agent) {
        return false;
    }

    try {
        const transaction = agent.getTransaction?.();
        return Boolean(transaction?.isActive?.());
    } catch {
        return false;
    }
}

/**
 * Safely record custom event to New Relic
 * Silently fails if New Relic is unavailable
 *
 * @param eventType - Event type name (PascalCase recommended)
 * @param attributes - Event attributes
 */
export function recordEvent(
    eventType: string,
    attributes: Record<string, string | number | boolean>
): void {
    const agent = getNewRelicAgent();
    if (!agent) {
        return;
    }

    try {
        agent.recordCustomEvent(eventType, attributes);
    } catch {
        // Silent fail - monitoring shouldn't break the app
    }
}

/**
 * Safely record custom metric to New Relic
 * Silently fails if New Relic is unavailable
 *
 * @param name - Metric name (use Custom/Category/Name format)
 * @param value - Metric value
 */
export function recordMetric(name: string, value: number): void {
    const agent = getNewRelicAgent();
    if (!agent) {
        return;
    }

    try {
        agent.recordMetric(name, value);
    } catch {
        // Silent fail
    }
}

/**
 * Safely add custom attribute to current transaction
 * Only adds if there's an active transaction
 * Silently fails if New Relic is unavailable or no transaction
 *
 * @param key - Attribute key
 * @param value - Attribute value (must be primitive)
 */
export function addAttribute(
    key: string,
    value: string | number | boolean
): void {
    const agent = getNewRelicAgent();
    if (!agent) {
        return;
    }

    try {
        // Check for active transaction before adding attributes
        const transaction = agent.getTransaction?.();
        if (!transaction || !transaction.isActive?.()) {
            return;
        }
        agent.addCustomAttribute(key, value);
    } catch {
        // Silent fail
    }
}

/**
 * Safely add multiple custom attributes to current transaction
 * Only adds if there's an active transaction
 * Silently fails if New Relic is unavailable or no transaction
 *
 * @param attributes - Record of attribute key-value pairs
 */
export function addAttributes(
    attributes: Record<string, string | number | boolean>
): void {
    const agent = getNewRelicAgent();
    if (!agent) {
        return;
    }

    try {
        // Check for active transaction before adding attributes
        const transaction = agent.getTransaction?.();
        if (!transaction || !transaction.isActive?.()) {
            return;
        }

        for (const [key, value] of Object.entries(attributes)) {
            agent.addCustomAttribute(key, value);
        }
    } catch {
        // Silent fail
    }
}

/**
 * Safely report error to New Relic
 * Silently fails if New Relic is unavailable
 *
 * @param error - Error to report
 * @param customAttributes - Optional custom attributes for context
 */
export function noticeError(
    error: Error,
    customAttributes?: Record<string, unknown>
): void {
    const agent = getNewRelicAgent();
    if (!agent) {
        return;
    }

    try {
        agent.noticeError(error, customAttributes);
    } catch {
        // Silent fail
    }
}
