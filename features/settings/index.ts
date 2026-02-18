/**
 * Settings Feature Barrel Export
 *
 * Main barrel export for the settings feature module.
 *
 * @module features/settings
 */

// =============================================================================
// Components
// =============================================================================

export {
	ModelSelector,
	SettingsButton,
	SettingsSheet,
	ThemeToggle,
	ThemeToggleButton,
} from "./components"

// =============================================================================
// Provider (Context-based settings with localStorage persistence)
// =============================================================================

export type { SettingsStore } from "./components"
export {
	DEFAULT_APP_SETTINGS,
	SettingsProvider,
	useSamplingSettings,
	useSettings,
	useSettingsModelSelection,
	useSettingsSnapshot,
	useSystemPrompt,
} from "./components"

// =============================================================================
// Hooks (Server action-based settings)
// =============================================================================

export type {
	UseAppSettingsReturn,
	UseModelSelectionReturn,
	UseThemeReturn,
} from "./hooks"
export {
	DEFAULT_PREFERENCES,
	useAppSettings,
	useModelSelection as useModelSelectionHook,
	useTheme,
} from "./hooks"

// =============================================================================
// Server Actions
// =============================================================================

export {
	clearAllData,
	clearArtifacts,
	clearChats,
	exportUserData,
	getAppSettings,
	getPreferences,
	resetAppSettings,
	resetPreferences,
	updateAppSettings,
	updatePreferences,
} from "./actions"

// =============================================================================
// Schemas
// =============================================================================

export {
	appSettingsSchema,
	fontSizeSchema,
	modelCapabilitySchema,
	modelOptionSchema,
	samplingSettingsSchema,
	themeModeSchema,
	updateAppSettingsSchema,
	updateUserPreferencesSchema,
	userPreferencesSchema,
} from "./schemas"

// =============================================================================
// Types
// =============================================================================

export type {
	AppSettings,
	// Model types
	ModelCapability,
	ModelConfig,
	ModelOption,
	ModelSelectorProps,
	// Sampling types
	SamplingSettings,
	SettingsButtonProps,
	SettingsContextValue,
	// Component props
	SettingsSheetProps,
	// State types
	SettingsState,
	ThemeConfig,
	// Theme types
	ThemeMode,
	ThemeToggleProps,
	// Action types
	UpdatePreferencesInput,
	UpdatePreferencesResult,
	// Preferences types
	UserPreferences,
} from "./types"

// Re-export default values
export { DEFAULT_SAMPLING } from "./types"
