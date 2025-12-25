/**
 * Feature Flag System
 * Simple feature flag implementation for gradual rollouts
 *
 * @module lib/utils/feature-flags
 *
 * ## SSR Safety
 * This module is designed to be SSR-safe. All methods that depend on user context
 * accept `userId` as an explicit parameter rather than relying on mutable module state.
 *
 * For testing purposes, use `__testing.overrideFlags()` and `__testing.resetFlags()`.
 */

export type FeatureFlagValue = boolean | string | number;

export interface FeatureFlag {
    name: string;
    enabled: boolean;
    value?: FeatureFlagValue;
    description?: string;
    /** Percentage of users to enable (0-100) */
    rolloutPercentage?: number;
}

export interface FeatureFlagConfig {
    flags: Record<string, FeatureFlag>;
}

// Default feature flags configuration
const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
    // Chat features
    streamingResponses: {
        name: "streamingResponses",
        enabled: true,
        description: "Enable streaming AI responses",
    },
    multimodalInput: {
        name: "multimodalInput",
        enabled: true,
        description: "Enable image and file attachments",
    },
    chatHistory: {
        name: "chatHistory",
        enabled: true,
        description: "Enable chat history persistence",
    },

    // UI features
    darkMode: {
        name: "darkMode",
        enabled: true,
        description: "Enable dark mode toggle",
    },
    sidebarCollapse: {
        name: "sidebarCollapse",
        enabled: true,
        description: "Enable sidebar collapse feature",
    },
    keyboardShortcuts: {
        name: "keyboardShortcuts",
        enabled: true,
        description: "Enable keyboard shortcuts",
    },

    // Experimental features
    experimentalCanvas: {
        name: "experimentalCanvas",
        enabled: false,
        description: "Enable experimental canvas feature",
        rolloutPercentage: 0,
    },
    betaFeatures: {
        name: "betaFeatures",
        enabled: false,
        description: "Enable beta features for testing",
        rolloutPercentage: 0,
    },
    debugMode: {
        name: "debugMode",
        enabled: process.env.NODE_ENV === "development",
        description: "Enable debug mode",
    },
};

// Immutable flags - frozen to prevent accidental mutation
// Use __testing.overrideFlags() for test overrides only
let flags: Readonly<Record<string, FeatureFlag>> = Object.freeze({
    ...DEFAULT_FLAGS,
});

/**
 * Simple hash function for consistent rollout evaluation
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash &= hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Check if user is in rollout percentage
 */
function isInRollout(
    flagName: string,
    percentage: number,
    uid?: string
): boolean {
    if (percentage >= 100) {
        return true;
    }
    if (percentage <= 0) {
        return false;
    }

    const identifier = uid || "anonymous";
    const hash = simpleHash(`${flagName}:${identifier}`);
    return hash % 100 < percentage;
}

/**
 * Feature flags interface
 *
 * @example
 * ```typescript
 * import { featureFlags } from "@/lib/utils/feature-flags";
 *
 * // Check if feature is enabled (SSR-safe with explicit userId)
 * if (featureFlags.isEnabled("streamingResponses", userId)) {
 *   // Use streaming
 * }
 *
 * // Get flag value
 * const maxTokens = featureFlags.getValue("maxTokens", 4096);
 *
 * // For testing only - override flags
 * featureFlags.__testing.overrideFlags({ experimentalCanvas: { ...flag, enabled: true } });
 * featureFlags.__testing.resetFlags();
 * ```
 */
export const featureFlags = {
    /**
     * Check if a feature flag is enabled
     * @param flagName - The name of the flag to check
     * @param userId - Optional user ID for rollout percentage evaluation (SSR-safe)
     */
    isEnabled(flagName: string, userId?: string): boolean {
        const flag = flags[flagName];
        if (!flag) {
            return false;
        }

        // Check rollout percentage if specified
        if (
            flag.rolloutPercentage !== undefined &&
            flag.rolloutPercentage < 100
        ) {
            return (
                flag.enabled &&
                isInRollout(flagName, flag.rolloutPercentage, userId)
            );
        }

        return flag.enabled;
    },

    /**
     * Get a flag's value with optional default
     */
    getValue<T extends FeatureFlagValue>(flagName: string, defaultValue: T): T {
        const flag = flags[flagName];
        if (!flag || flag.value === undefined) {
            return defaultValue;
        }
        return flag.value as T;
    },

    /**
     * Get all flags
     */
    getAll(): Record<string, FeatureFlag> {
        return { ...flags };
    },

    /**
     * Get all enabled flag names
     * @param userId - Optional user ID for rollout percentage evaluation (SSR-safe)
     */
    getEnabledFlags(userId?: string): string[] {
        return Object.entries(flags)
            .filter(([name]) => this.isEnabled(name, userId))
            .map(([name]) => name);
    },

    /**
     * Check multiple flags at once
     * @param flagNames - Array of flag names to check
     * @param userId - Optional user ID for rollout percentage evaluation (SSR-safe)
     */
    check(flagNames: string[], userId?: string): Record<string, boolean> {
        return flagNames.reduce(
            (acc, name) => {
                acc[name] = this.isEnabled(name, userId);
                return acc;
            },
            {} as Record<string, boolean>
        );
    },

    /**
     * Testing utilities - ONLY use in test environments
     * These methods provide controlled mutation for test setup/teardown
     */
    __testing: {
        /**
         * Override flags for testing purposes
         * @warning Only use in test files
         */
        overrideFlags(overrides: Record<string, Partial<FeatureFlag>>): void {
            if (
                process.env.NODE_ENV !== "test" &&
                process.env.NODE_ENV !== "development"
            ) {
                throw new Error(
                    "[FeatureFlags] __testing.overrideFlags() can only be used in test/development environments"
                );
            }
            const newFlags: Record<string, FeatureFlag> = { ...flags };
            for (const [name, override] of Object.entries(overrides)) {
                newFlags[name] = {
                    ...DEFAULT_FLAGS[name],
                    ...flags[name],
                    ...override,
                    name,
                } as FeatureFlag;
            }
            flags = Object.freeze(newFlags);
        },

        /**
         * Reset all flags to defaults for testing purposes
         * @warning Only use in test files
         */
        resetFlags(): void {
            if (
                process.env.NODE_ENV !== "test" &&
                process.env.NODE_ENV !== "development"
            ) {
                throw new Error(
                    "[FeatureFlags] __testing.resetFlags() can only be used in test/development environments"
                );
            }
            flags = Object.freeze({ ...DEFAULT_FLAGS });
        },

        /**
         * Get the default flags (read-only access for test assertions)
         */
        getDefaultFlags(): Readonly<Record<string, FeatureFlag>> {
            return DEFAULT_FLAGS;
        },
    },
};

/**
 * React hook helper for feature flags (for use in components)
 * @param flagName - The name of the flag to check
 * @param userId - Optional user ID for rollout percentage evaluation
 */
export function useFeatureFlag(flagName: string, userId?: string): boolean {
    // In a real implementation, this would use React state
    // and potentially subscribe to flag changes
    return featureFlags.isEnabled(flagName, userId);
}

/**
 * HOC helper for conditional rendering based on feature flags
 * @param flagName - The name of the flag to check
 * @param WrappedComponent - Component to render when flag is enabled
 * @param FallbackComponent - Optional component to render when flag is disabled
 * @param userId - Optional user ID for rollout percentage evaluation
 */
export function withFeatureFlag<P extends object>(
    flagName: string,
    WrappedComponent: React.ComponentType<P>,
    FallbackComponent?: React.ComponentType<P>,
    userId?: string
): React.FC<P> {
    return function FeatureFlaggedComponent(props: P) {
        const isEnabled = featureFlags.isEnabled(flagName, userId);

        if (isEnabled) {
            return <WrappedComponent {...props} />;
        }

        if (FallbackComponent) {
            return <FallbackComponent {...props} />;
        }

        return null;
    };
}

export default featureFlags;
