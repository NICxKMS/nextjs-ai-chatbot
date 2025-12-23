/**
 * Feature Flag System
 * Simple feature flag implementation for gradual rollouts
 *
 * @module lib/utils/feature-flags
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
    /** User ID for consistent flag evaluation */
    userId?: string;
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

// Internal state
let flags: Record<string, FeatureFlag> = { ...DEFAULT_FLAGS };
let userId: string | undefined;

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
 * // Check if feature is enabled
 * if (featureFlags.isEnabled("streamingResponses")) {
 *   // Use streaming
 * }
 *
 * // Get flag value
 * const maxTokens = featureFlags.getValue("maxTokens", 4096);
 *
 * // Set user for consistent rollouts
 * featureFlags.setUser("user-123");
 *
 * // Override a flag (useful for testing)
 * featureFlags.override("experimentalCanvas", true);
 * ```
 */
export const featureFlags = {
    /**
     * Check if a feature flag is enabled
     */
    isEnabled(flagName: string): boolean {
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
     */
    getEnabledFlags(): string[] {
        return Object.entries(flags)
            .filter(([name]) => this.isEnabled(name))
            .map(([name]) => name);
    },

    /**
     * Set user ID for consistent rollout evaluation
     */
    setUser(id: string | undefined): void {
        userId = id;
    },

    /**
     * Override a flag value (useful for testing)
     */
    override(
        flagName: string,
        enabled: boolean,
        value?: FeatureFlagValue
    ): void {
        const existing = flags[flagName];
        flags[flagName] = {
            name: flagName,
            enabled,
            value,
            description: existing?.description,
            rolloutPercentage: 100, // Override rollout
        };

        if (process.env.NODE_ENV === "development") {
            console.debug(`[FeatureFlags] Override: ${flagName} = ${enabled}`);
        }
    },

    /**
     * Reset a flag to default
     */
    reset(flagName: string): void {
        if (DEFAULT_FLAGS[flagName]) {
            flags[flagName] = { ...DEFAULT_FLAGS[flagName] };
        } else {
            delete flags[flagName];
        }
    },

    /**
     * Reset all flags to defaults
     */
    resetAll(): void {
        flags = { ...DEFAULT_FLAGS };
        userId = undefined;
    },

    /**
     * Load flags from external config
     */
    load(config: Partial<FeatureFlagConfig>): void {
        if (config.flags) {
            flags = { ...DEFAULT_FLAGS, ...config.flags };
        }
        if (config.userId !== undefined) {
            userId = config.userId;
        }
    },

    /**
     * Register a new flag dynamically
     */
    register(flag: FeatureFlag): void {
        flags[flag.name] = flag;
    },

    /**
     * Check multiple flags at once
     */
    check(flagNames: string[]): Record<string, boolean> {
        return flagNames.reduce(
            (acc, name) => {
                acc[name] = this.isEnabled(name);
                return acc;
            },
            {} as Record<string, boolean>
        );
    },
};

// React hook helper (for use in components)
export function useFeatureFlag(flagName: string): boolean {
    // In a real implementation, this would use React state
    // and potentially subscribe to flag changes
    return featureFlags.isEnabled(flagName);
}

// HOC helper for conditional rendering
export function withFeatureFlag<P extends object>(
    flagName: string,
    WrappedComponent: React.ComponentType<P>,
    FallbackComponent?: React.ComponentType<P>
): React.FC<P> {
    return function FeatureFlaggedComponent(props: P) {
        const isEnabled = featureFlags.isEnabled(flagName);

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
