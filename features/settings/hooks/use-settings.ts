/**
 * Settings Hook
 *
 * React hook for managing settings state with optimistic updates and persistence.
 *
 * @module features/settings/hooks/use-settings
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import {
	getAppSettings,
	getPreferences,
	resetAppSettings,
	resetPreferences,
	updateAppSettings,
	updatePreferences,
} from "../actions"
import type {
	AppSettings,
	SettingsContextValue,
	ThemeMode,
	UserPreferences,
} from "../types"
import { DEFAULT_APP_SETTINGS, DEFAULT_PREFERENCES } from "../types"

// =============================================================================
// Settings Hook
// =============================================================================

/**
 * Main settings hook
 *
 * Manages preferences state with optimistic updates and persistence.
 *
 * @returns Settings context value with state and actions
 */
export function useSettings(): SettingsContextValue {
	const [preferences, setPreferences] =
		useState<UserPreferences>(DEFAULT_PREFERENCES)
	const [isLoading, setIsLoading] = useState(true)
	const [isUpdating, setIsUpdating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Load preferences on mount
	useEffect(() => {
		async function loadPreferences() {
			try {
				setIsLoading(true)
				const result = await getPreferences()
				setPreferences(result)
				setError(null)
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Failed to load preferences",
				)
			} finally {
				setIsLoading(false)
			}
		}

		loadPreferences()
	}, [])

	// Update a single preference
	const updatePreference = useCallback(
		async <K extends keyof UserPreferences>(
			key: K,
			value: UserPreferences[K],
		): Promise<void> => {
			try {
				setIsUpdating(true)
				// Optimistic update
				setPreferences((prev) => ({ ...prev, [key]: value }))

				const result = await updatePreferences({ [key]: value })

				if (!result.success) {
					// Revert on failure
					setPreferences((prev) => ({
						...prev,
						[key]: preferences[key],
					}))
					setError(result.error ?? "Failed to update preference")
				} else if (result.preferences) {
					setPreferences(result.preferences)
					setError(null)
				}
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Failed to update preference",
				)
			} finally {
				setIsUpdating(false)
			}
		},
		[preferences],
	)

	// Reset all preferences
	const resetPreferencesAction = useCallback(async (): Promise<void> => {
		try {
			setIsUpdating(true)
			const result = await resetPreferences()

			if (!result.success) {
				setError(result.error ?? "Failed to reset preferences")
			} else if (result.preferences) {
				setPreferences(result.preferences)
				setError(null)
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to reset preferences",
			)
		} finally {
			setIsUpdating(false)
		}
	}, [])

	return {
		preferences,
		isLoading,
		error,
		updatePreference,
		resetPreferences: resetPreferencesAction,
		isUpdating,
	}
}

// =============================================================================
// App Settings Hook
// =============================================================================

/**
 * App settings hook return type
 */
export interface UseAppSettingsReturn {
	/** Current app settings */
	settings: AppSettings
	/** Whether settings are loading */
	isLoading: boolean
	/** Whether an update is in progress */
	isUpdating: boolean
	/** Error message if any */
	error: string | null
	/** Update settings partially */
	updateSettings: (updates: Partial<AppSettings>) => Promise<void>
	/** Reset settings to defaults */
	resetSettings: () => Promise<void>
	/** Update sampling settings */
	updateSampling: (updates: Partial<AppSettings["sampling"]>) => Promise<void>
}

/**
 * App settings hook
 *
 * Manages app-wide settings (sampling, system prompt, etc.)
 *
 * @returns App settings state and actions
 */
export function useAppSettings(): UseAppSettingsReturn {
	const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
	const [isLoading, setIsLoading] = useState(true)
	const [isUpdating, setIsUpdating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Load settings on mount
	useEffect(() => {
		async function loadSettings() {
			try {
				setIsLoading(true)
				const result = await getAppSettings()
				setSettings(result)
				setError(null)
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Failed to load settings",
				)
			} finally {
				setIsLoading(false)
			}
		}

		loadSettings()
	}, [])

	// Update settings
	const updateSettingsAction = useCallback(
		async (updates: Partial<AppSettings>): Promise<void> => {
			try {
				setIsUpdating(true)
				// Optimistic update
				setSettings((prev) => ({ ...prev, ...updates }))

				const result = await updateAppSettings(updates)

				if (!result.success) {
					setError(result.error ?? "Failed to update settings")
				} else if (result.settings) {
					setSettings(result.settings)
					setError(null)
				}
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Failed to update settings",
				)
			} finally {
				setIsUpdating(false)
			}
		},
		[],
	)

	// Reset settings
	const resetSettingsAction = useCallback(async (): Promise<void> => {
		try {
			setIsUpdating(true)
			const result = await resetAppSettings()

			if (!result.success) {
				setError(result.error ?? "Failed to reset settings")
			} else if (result.settings) {
				setSettings(result.settings)
				setError(null)
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to reset settings",
			)
		} finally {
			setIsUpdating(false)
		}
	}, [])

	// Update sampling settings
	const updateSampling = useCallback(
		async (updates: Partial<AppSettings["sampling"]>): Promise<void> => {
			await updateSettingsAction({
				sampling: { ...settings.sampling, ...updates },
			})
		},
		[settings.sampling, updateSettingsAction],
	)

	return {
		settings,
		isLoading,
		isUpdating,
		error,
		updateSettings: updateSettingsAction,
		resetSettings: resetSettingsAction,
		updateSampling,
	}
}

// =============================================================================
// Theme Hook
// =============================================================================

/**
 * Theme hook return type
 */
export interface UseThemeReturn {
	/** Current theme preference */
	theme: ThemeMode
	/** Resolved theme (light/dark after system detection) */
	resolvedTheme: "light" | "dark"
	/** Set theme preference */
	setTheme: (theme: ThemeMode) => void
	/** System theme preference */
	systemTheme: "light" | "dark"
}

/**
 * Theme hook
 *
 * Manages theme state with system preference detection.
 *
 * @returns Theme state and actions
 */
export function useTheme(): UseThemeReturn {
	const [theme, setThemeState] = useState<ThemeMode>("system")
	const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light")

	// Detect system theme preference
	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

		const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
			setSystemTheme(e.matches ? "dark" : "light")
		}

		// Set initial value
		handleChange(mediaQuery)

		// Listen for changes
		mediaQuery.addEventListener("change", handleChange)

		return () => {
			mediaQuery.removeEventListener("change", handleChange)
		}
	}, [])

	// Load saved theme on mount
	useEffect(() => {
		const savedTheme = localStorage.getItem("theme") as ThemeMode | null
		if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
			setThemeState(savedTheme)
		}
	}, [])

	// Set theme and persist
	const setTheme = useCallback((newTheme: ThemeMode) => {
		setThemeState(newTheme)
		localStorage.setItem("theme", newTheme)
	}, [])

	// Resolve theme
	const resolvedTheme: "light" | "dark" =
		theme === "system" ? systemTheme : theme

	return {
		theme,
		resolvedTheme,
		setTheme,
		systemTheme,
	}
}

// =============================================================================
// Model Selection Hook
// =============================================================================

/**
 * Model selection hook return type
 */
export interface UseModelSelectionReturn {
	/** Currently selected model ID */
	selectedModel: string
	/** Available models */
	availableModels: Array<{
		id: string
		name: string
		provider: string
	}>
	/** Select a model */
	selectModel: (modelId: string) => void
	/** Whether models are loading */
	isLoading: boolean
}

/**
 * Default available models
 */
const DEFAULT_MODELS = [
	{ id: "gpt-4", name: "GPT-4", provider: "OpenAI" },
	{ id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
	{ id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
	{ id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
	{ id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic" },
]

/**
 * Model selection hook
 *
 * Manages AI model selection state.
 *
 * @returns Model selection state and actions
 */
export function useModelSelection(): UseModelSelectionReturn {
	const [selectedModel, setSelectedModel] = useState("gpt-4")
	const [availableModels] = useState(DEFAULT_MODELS)
	const [isLoading] = useState(false)

	// Load saved model on mount
	useEffect(() => {
		const savedModel = localStorage.getItem("selectedModel")
		if (savedModel) {
			setSelectedModel(savedModel)
		}
	}, [])

	// Select model and persist
	const selectModel = useCallback((modelId: string) => {
		setSelectedModel(modelId)
		localStorage.setItem("selectedModel", modelId)
	}, [])

	return {
		selectedModel,
		availableModels,
		selectModel,
		isLoading,
	}
}

// =============================================================================
// Exports
// =============================================================================

export { DEFAULT_PREFERENCES, DEFAULT_APP_SETTINGS }
