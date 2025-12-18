/**
 * User Entitlements System
 * @module new-arch/lib/ai/entitlements
 *
 * Defines model access permissions based on user type.
 */

import { getAllModels, type ModelRegistryEntry } from "./models/registry";

// ============================================================================
// Types
// ============================================================================

/**
 * User types for entitlement checking.
 */
export type UserType = "guest" | "free" | "pro" | "admin";

/**
 * Entitlements configuration for a user type.
 */
export type Entitlements = {
    maxMessagesPerDay: number;
    availableChatModelIds: string[];
};

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get all available model IDs from the registry.
 */
const getAllModelIds = (): string[] =>
    (getAllModels() as readonly ModelRegistryEntry[]).map((model) => model.id);

/**
 * Model IDs available to free tier users.
 * Subset of all models, typically excluding premium/expensive models.
 */
const getFreeModelIds = (): string[] => {
    const allModels = getAllModels() as readonly ModelRegistryEntry[];
    // Free users get access to non-premium models
    // Filter out models with "o1", "pro", or "premium" in the ID
    return allModels
        .filter(
            (model) =>
                !(
                    model.id.includes("o1") ||
                    model.id.includes("pro") ||
                    model.id.includes("premium")
                )
        )
        .map((model) => model.id);
};

/**
 * Entitlements by user type.
 */
export const entitlementsByUserType: Record<UserType, Entitlements> = {
    /**
     * Guest users - limited access without account
     */
    guest: {
        maxMessagesPerDay: 10,
        availableChatModelIds: getFreeModelIds(),
    },

    /**
     * Free users - registered but no paid subscription
     */
    free: {
        maxMessagesPerDay: 50,
        availableChatModelIds: getFreeModelIds(),
    },

    /**
     * Pro users - paid subscription
     */
    pro: {
        maxMessagesPerDay: 500,
        availableChatModelIds: getAllModelIds(),
    },

    /**
     * Admin users - full access
     */
    admin: {
        maxMessagesPerDay: Number.POSITIVE_INFINITY,
        availableChatModelIds: getAllModelIds(),
    },
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the list of model IDs a user type can access.
 *
 * @param userType - The user's type/tier
 * @returns Array of accessible model IDs
 *
 * @example
 * ```ts
 * const models = getModelEntitlements('pro');
 * // Returns all available model IDs for pro users
 * ```
 */
export function getModelEntitlements(userType: UserType): string[] {
    const entitlements = entitlementsByUserType[userType];
    if (!entitlements) {
        // Default to guest if unknown user type
        return entitlementsByUserType.guest.availableChatModelIds;
    }
    return entitlements.availableChatModelIds;
}

/**
 * Check if a user type can access a specific model.
 *
 * @param userType - The user's type/tier
 * @param modelId - The model ID to check access for
 * @returns true if the user can access the model
 *
 * @example
 * ```ts
 * if (canAccessModel('free', 'gpt-4o')) {
 *   // Allow model usage
 * }
 * ```
 */
export function canAccessModel(userType: UserType, modelId: string): boolean {
    const allowedModels = getModelEntitlements(userType);
    return allowedModels.includes(modelId);
}

/**
 * Get the maximum messages per day for a user type.
 *
 * @param userType - The user's type/tier
 * @returns Maximum messages allowed per day
 */
export function getMaxMessagesPerDay(userType: UserType): number {
    const entitlements = entitlementsByUserType[userType];
    if (!entitlements) {
        return entitlementsByUserType.guest.maxMessagesPerDay;
    }
    return entitlements.maxMessagesPerDay;
}

/**
 * Get full entitlements for a user type.
 *
 * @param userType - The user's type/tier
 * @returns Full entitlements object
 */
export function getEntitlements(userType: UserType): Entitlements {
    return entitlementsByUserType[userType] ?? entitlementsByUserType.guest;
}
