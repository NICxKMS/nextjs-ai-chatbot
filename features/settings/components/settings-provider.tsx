/**
 * Settings Provider Component
 *
 * React Context provider for settings state management with localStorage persistence.
 * Provides centralized access to app settings including model selection, temperature,
 * and system prompt across all components.
 *
 * @module features/settings/components/settings-provider
 */

"use client"

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react"
import { useLocalStorage } from "usehooks-ts"
import { AppError } from "@/lib/errors"
import type { AppSettings, SamplingSettings } from "../types"
import { DEFAULT_APP_SETTINGS } from "../types"

// =============================================================================
// Constants
// =============================================================================

const SETTINGS_STORAGE_KEY = "chat-sdk.settings"

// =============================================================================
// Types
// =============================================================================

/**
 * Settings store interface
 */
export interface SettingsStore {
	/** Current settings state */
	settings: AppSettings
	/** Update settings with an updater function */
	updateSettings: (updater: (current: AppSettings) => AppSettings) => void
	/** Reset all settings to defaults */
	resetSettings: () => void
	/** Update the selected model ID */
	setSelectedModelId: (modelId: string | undefined) => void
	/** Update sampling settings */
	updateSampling: (sampling: Partial<SamplingSettings>) => void
	/** Update system prompt */
	setSystemPrompt: (prompt: string) => void
	/** Whether settings have been hydrated from localStorage */
	isHydrated: boolean
}

// =============================================================================
// Context
// =============================================================================

const SettingsContext = createContext<SettingsStore | undefined>(undefined)

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Settings Provider
 *
 * Wraps children with settings context, providing:
 * - localStorage persistence for settings
 * - Centralized state management
 * - Type-safe settings access
 *
 * @param props - Component props
 * @param props.children - Child components
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
	const [isHydrated, setIsHydrated] = useState(false)

	// Use localStorage for persistence
	const [settings, setSettings] = useLocalStorage<AppSettings>(
		SETTINGS_STORAGE_KEY,
		DEFAULT_APP_SETTINGS,
		{ initializeWithValue: false },
	)

	// Mark as hydrated after initial mount
	useEffect(() => {
		setIsHydrated(true)
	}, [])

	// Update settings with an updater function
	const updateSettings = useCallback(
		(updater: (current: AppSettings) => AppSettings) => {
			setSettings((previous) => updater(previous ?? DEFAULT_APP_SETTINGS))
		},
		[setSettings],
	)

	// Reset settings to defaults
	const resetSettings = useCallback(() => {
		setSettings(DEFAULT_APP_SETTINGS)
	}, [setSettings])

	// Update selected model ID
	const setSelectedModelId = useCallback(
		(modelId: string | undefined) => {
			setSettings((previous) => {
				const current = previous ?? DEFAULT_APP_SETTINGS
				return {
					...current,
					selectedModelId: modelId ?? current.selectedModelId,
				}
			})
		},
		[setSettings],
	)

	// Update sampling settings
	const updateSampling = useCallback(
		(sampling: Partial<SamplingSettings>) => {
			setSettings((previous) => ({
				...(previous ?? DEFAULT_APP_SETTINGS),
				sampling: {
					...(previous?.sampling ?? DEFAULT_APP_SETTINGS.sampling),
					...sampling,
				},
			}))
		},
		[setSettings],
	)

	// Update system prompt
	const setSystemPrompt = useCallback(
		(prompt: string) => {
			setSettings((previous) => ({
				...(previous ?? DEFAULT_APP_SETTINGS),
				systemPrompt: prompt,
			}))
		},
		[setSettings],
	)

	// Memoize context value
	const value = useMemo<SettingsStore>(
		() => ({
			settings: settings ?? DEFAULT_APP_SETTINGS,
			updateSettings,
			resetSettings,
			setSelectedModelId,
			updateSampling,
			setSystemPrompt,
			isHydrated,
		}),
		[
			settings,
			updateSettings,
			resetSettings,
			setSelectedModelId,
			updateSampling,
			setSystemPrompt,
			isHydrated,
		],
	)

	return (
		<SettingsContext.Provider value={value}>
			{children}
		</SettingsContext.Provider>
	)
}

// =============================================================================
// Hook
// =============================================================================

/**
 * useSettings Hook
 *
 * Access the settings context. Must be used within a SettingsProvider.
 *
 * @returns Settings store with state and actions
 * @throws AppError if used outside of SettingsProvider
 */
export function useSettings(): SettingsStore {
	const context = useContext(SettingsContext)

	if (!context) {
		throw new AppError(
			"bad_request:ui:useSettings_outside_provider",
			"useSettings must be used within a SettingsProvider",
			400,
		)
	}

	return context
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * useSettingsSnapshot Hook
 *
 * Returns just the settings state without actions.
 * Useful when you only need to read settings.
 *
 * @returns Current settings state
 */
export function useSettingsSnapshot(): AppSettings {
	return useSettings().settings
}

/**
 * useModelSelection Hook
 *
 * Returns model selection state and actions.
 * Convenience hook for model selection use cases.
 *
 * @returns Model ID and setter
 */
export function useSettingsModelSelection(): {
	selectedModelId: string | undefined
	setSelectedModelId: (modelId: string | undefined) => void
} {
	const { settings, setSelectedModelId } = useSettings()

	return {
		selectedModelId: settings.selectedModelId,
		setSelectedModelId,
	}
}

/**
 * useSamplingSettings Hook
 *
 * Returns sampling settings and actions.
 * Convenience hook for temperature/top-p/max tokens adjustments.
 *
 * @returns Sampling settings and updater
 */
export function useSamplingSettings(): {
	sampling: SamplingSettings
	updateSampling: (sampling: Partial<SamplingSettings>) => void
} {
	const { settings, updateSampling } = useSettings()

	return {
		sampling: settings.sampling,
		updateSampling,
	}
}

/**
 * useSystemPrompt Hook
 *
 * Returns system prompt state and action.
 * Convenience hook for system prompt management.
 *
 * @returns System prompt and setter
 */
export function useSystemPrompt(): {
	systemPrompt: string
	setSystemPrompt: (prompt: string) => void
} {
	const { settings, setSystemPrompt } = useSettings()

	return {
		systemPrompt: settings.systemPrompt,
		setSystemPrompt,
	}
}

// =============================================================================
// Default Export
// =============================================================================

export { DEFAULT_APP_SETTINGS }
