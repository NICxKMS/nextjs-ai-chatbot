/**
 * User Entitlements
 *
 * Defines per-user-type rate limiting and model access control.
 * Guest users have limited messages per day, while regular users have higher limits.
 *
 * @module lib/ai/entitlements
 */

import type { AppUserType } from "@/lib/auth/session"
import { listChatModels } from "./registry"

// =============================================================================
// Types
// =============================================================================

/**
 * User entitlements defining rate limits and model access
 */
export type Entitlements = {
	/** Maximum number of messages allowed per day */
	maxMessagesPerDay: number
	/** List of model IDs available to this user type */
	availableChatModelIds: string[]
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all available chat model IDs
 *
 * @returns Array of all chat model IDs
 */
const getAllModelIds = (): string[] => listChatModels().map((model) => model.id)

// =============================================================================
// Entitlements Configuration
// =============================================================================

/**
 * Entitlements configuration by user type.
 * Defines rate limits and model access for each user category.
 */
export const entitlementsByUserType: Record<AppUserType, Entitlements> = {
	/**
	 * Guest users - limited messages, all models available
	 */
	guest: {
		maxMessagesPerDay: 20,
		availableChatModelIds: getAllModelIds(),
	},

	/**
	 * Regular authenticated users - higher limits, all models available
	 */
	regular: {
		maxMessagesPerDay: 100,
		availableChatModelIds: getAllModelIds(),
	},
}

// =============================================================================
// Entitlement Functions
// =============================================================================

/**
 * Get entitlements for a specific user type
 *
 * @param userType - The type of user (guest or regular)
 * @returns Entitlements for the specified user type
 *
 * @example
 * ```typescript
 * const entitlements = getEntitlements('guest');
 * console.log(entitlements.maxMessagesPerDay); // 20
 * ```
 */
export function getEntitlements(userType: AppUserType): Entitlements {
	return entitlementsByUserType[userType]
}
