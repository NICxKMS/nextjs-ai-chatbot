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
// Hooks
// =============================================================================

export type {
	UseAppSettingsReturn,
	UseModelSelectionReturn,
	UseThemeReturn,
} from "./hooks"
export {
	DEFAULT_APP_SETTINGS,
	DEFAULT_PREFERENCES,
	useAppSettings,
	useModelSelection,
	useSettings,
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
