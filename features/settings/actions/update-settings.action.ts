/**
 * Update Settings Server Action
 *
 * Server action for updating user settings and preferences.
 *
 * @module features/settings/actions/update-settings
 */

"use server"

import { getSession } from "@/lib/auth/session"
import { UnauthorizedError, ValidationError } from "@/lib/errors"
import { updateUserPreferencesSchema } from "../schemas"
import type {
	AppSettings,
	UpdatePreferencesResult,
	UserPreferences,
} from "../types"
import { DEFAULT_APP_SETTINGS, DEFAULT_PREFERENCES } from "../types"

// =============================================================================
// In-Memory Settings Store (Temporary)
// TODO: Replace with database persistence when user settings table is created
// =============================================================================

/**
 * In-memory store for user settings.
 * This is a temporary solution until database persistence is implemented.
 */
const settingsStore = new Map<
	string,
	{ preferences: UserPreferences; appSettings: AppSettings }
>()

// =============================================================================
// Server Actions
// =============================================================================

/**
 * Get user preferences
 *
 * Retrieves the current user's preferences from the store.
 * Falls back to defaults for new users.
 *
 * @returns User preferences
 * @throws UnauthorizedError if not authenticated
 */
export async function getPreferences(): Promise<UserPreferences> {
	const session = await getSession()

	if (!session?.user) {
		throw new UnauthorizedError(
			"Authentication required to get preferences",
		)
	}

	const userId = session.user.id
	const stored = settingsStore.get(userId)

	if (!stored) {
		// Return defaults for new users
		return { ...DEFAULT_PREFERENCES }
	}

	return { ...stored.preferences }
}

/**
 * Update user preferences
 *
 * Updates the current user's preferences with partial values.
 * Validates input and merges with existing preferences.
 *
 * @param input - Partial preferences to update
 * @returns Update result with success status and updated preferences
 */
export async function updatePreferences(
	input: Partial<UserPreferences>,
): Promise<UpdatePreferencesResult> {
	try {
		const session = await getSession()

		if (!session?.user) {
			throw new UnauthorizedError(
				"Authentication required to update preferences",
			)
		}

		// Validate input
		const validationResult = updateUserPreferencesSchema.safeParse(input)
		if (!validationResult.success) {
			throw new ValidationError(
				`Invalid preferences: ${validationResult.error.message}`,
			)
		}

		const userId = session.user.id
		const stored = settingsStore.get(userId)
		const currentPreferences = stored?.preferences ?? {
			...DEFAULT_PREFERENCES,
		}

		// Merge with existing preferences
		const updatedPreferences: UserPreferences = {
			...currentPreferences,
			...(validationResult.data as Partial<UserPreferences>),
		} as UserPreferences

		// Store updated preferences
		settingsStore.set(userId, {
			preferences: updatedPreferences,
			appSettings: stored?.appSettings ?? { ...DEFAULT_APP_SETTINGS },
		})

		return {
			success: true,
			preferences: updatedPreferences,
		}
	} catch (error) {
		if (error instanceof UnauthorizedError) {
			return {
				success: false,
				error: "Authentication required",
			}
		}
		if (error instanceof ValidationError) {
			return {
				success: false,
				error: error.message,
			}
		}
		return {
			success: false,
			error: "Failed to update preferences",
		}
	}
}

/**
 * Reset preferences to defaults
 *
 * Resets all user preferences to system defaults.
 *
 * @returns Update result with default preferences
 */
export async function resetPreferences(): Promise<UpdatePreferencesResult> {
	try {
		const session = await getSession()

		if (!session?.user) {
			throw new UnauthorizedError(
				"Authentication required to reset preferences",
			)
		}

		const userId = session.user.id
		const stored = settingsStore.get(userId)

		// Reset to defaults while preserving app settings
		settingsStore.set(userId, {
			preferences: { ...DEFAULT_PREFERENCES },
			appSettings: stored?.appSettings ?? { ...DEFAULT_APP_SETTINGS },
		})

		return {
			success: true,
			preferences: { ...DEFAULT_PREFERENCES },
		}
	} catch (error) {
		if (error instanceof UnauthorizedError) {
			return {
				success: false,
				error: "Authentication required",
			}
		}
		return {
			success: false,
			error: "Failed to reset preferences",
		}
	}
}

/**
 * Get app settings
 *
 * Retrieves the current user's app settings (sampling, system prompt, etc.)
 *
 * @returns App settings
 * @throws UnauthorizedError if not authenticated
 */
export async function getAppSettings(): Promise<AppSettings> {
	const session = await getSession()

	if (!session?.user) {
		throw new UnauthorizedError("Authentication required to get settings")
	}

	const userId = session.user.id
	const stored = settingsStore.get(userId)

	if (!stored) {
		return { ...DEFAULT_APP_SETTINGS }
	}

	return { ...stored.appSettings }
}

/**
 * Update app settings
 *
 * Updates the current user's app settings with partial values.
 *
 * @param input - Partial app settings to update
 * @returns Update result with success status
 */
export async function updateAppSettings(
	input: Partial<AppSettings>,
): Promise<{ success: boolean; settings?: AppSettings; error?: string }> {
	try {
		const session = await getSession()

		if (!session?.user) {
			throw new UnauthorizedError(
				"Authentication required to update settings",
			)
		}

		const userId = session.user.id
		const stored = settingsStore.get(userId)
		const currentSettings = stored?.appSettings ?? {
			...DEFAULT_APP_SETTINGS,
		}

		// Merge with existing settings
		const updatedSettings: AppSettings = {
			...currentSettings,
			...input,
		}

		// Store updated settings
		settingsStore.set(userId, {
			preferences: stored?.preferences ?? { ...DEFAULT_PREFERENCES },
			appSettings: updatedSettings,
		})

		return {
			success: true,
			settings: updatedSettings,
		}
	} catch (error) {
		if (error instanceof UnauthorizedError) {
			return {
				success: false,
				error: "Authentication required",
			}
		}
		return {
			success: false,
			error: "Failed to update settings",
		}
	}
}

/**
 * Reset app settings to defaults
 *
 * Resets all app settings to system defaults.
 *
 * @returns Update result with default settings
 */
export async function resetAppSettings(): Promise<{
	success: boolean
	settings?: AppSettings
	error?: string
}> {
	try {
		const session = await getSession()

		if (!session?.user) {
			throw new UnauthorizedError(
				"Authentication required to reset settings",
			)
		}

		const userId = session.user.id
		const stored = settingsStore.get(userId)

		// Reset to defaults while preserving preferences
		settingsStore.set(userId, {
			preferences: stored?.preferences ?? { ...DEFAULT_PREFERENCES },
			appSettings: { ...DEFAULT_APP_SETTINGS },
		})

		return {
			success: true,
			settings: { ...DEFAULT_APP_SETTINGS },
		}
	} catch (error) {
		if (error instanceof UnauthorizedError) {
			return {
				success: false,
				error: "Authentication required",
			}
		}
		return {
			success: false,
			error: "Failed to reset settings",
		}
	}
}
