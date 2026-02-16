/**
 * Settings Feature Types
 *
 * Type definitions for the settings feature module.
 *
 * @module features/settings/types
 */

// =============================================================================
// Theme Types
// =============================================================================

/**
 * Theme mode options
 */
export type ThemeMode = "light" | "dark" | "system"

/**
 * Theme configuration with resolved mode
 */
export interface ThemeConfig {
	/** Selected theme mode */
	mode: ThemeMode
	/** Resolved mode after system preference detection */
	resolvedMode: "light" | "dark"
}

// =============================================================================
// Model Selection Types
// =============================================================================

/**
 * AI model capability types
 */
export type ModelCapability =
	| "chat"
	| "code"
	| "vision"
	| "audio"
	| "function-calling"
	| "streaming"
	| "reasoning"
	| "multimodal"

/**
 * AI model metadata for selection
 */
export interface ModelOption {
	/** Unique model identifier */
	id: string
	/** Display name */
	name: string
	/** Provider name (e.g., "OpenAI", "Anthropic") */
	provider: string
	/** Provider ID */
	providerId?: string
	/** Optional description */
	description?: string
	/** Context window size in tokens */
	contextWindow?: number
	/** Maximum output tokens */
	maxTokens?: number
	/** Model capabilities */
	capabilities: ModelCapability[]
	/** Whether this is the default model */
	isDefault?: boolean
	/** Whether this model is curated/featured */
	isCurated?: boolean
	/** Model source (static or discovered) */
	source?: "static" | "discovered"
	/** Release date */
	release?: string
	/** Price information */
	price?: string
}

/**
 * Model configuration state
 */
export interface ModelConfig {
	/** Currently selected model ID */
	selectedModelId: string
	/** Available models list */
	availableModels: ModelOption[]
}

// =============================================================================
// Sampling Settings Types
// =============================================================================

/**
 * AI model sampling parameters
 */
export interface SamplingSettings {
	/** Temperature (0-2, controls randomness) */
	temperature: number
	/** Top P sampling (0-1) */
	topP: number
	/** Maximum output tokens */
	maxOutputTokens: number
}

// =============================================================================
// User Preferences Types
// =============================================================================

/**
 * Complete user preferences
 */
export interface UserPreferences {
	/** Theme preference */
	theme: ThemeMode
	/** Default AI model ID */
	defaultModel: string
	/** Interface language */
	language: string
	/** Font size preference */
	fontSize: "small" | "medium" | "large"
	/** Send message on Enter key */
	sendOnEnter: boolean
	/** Show message timestamps */
	showTimestamps: boolean
	/** Enable compact mode */
	compactMode: boolean
}

/**
 * App-wide settings including sampling and behavior
 */
export interface AppSettings {
	/** Selected model ID */
	selectedModelId: string
	/** Model selector display mode */
	modelSelectorDisplayMode: "full" | "compact"
	/** Sampling parameters */
	sampling: SamplingSettings
	/** Custom system prompt */
	systemPrompt: string
	/** Enable reasoning for supported models */
	enableReasoning: boolean
	/** Stream artifacts in real-time */
	streamArtifacts: boolean
	/** Auto-scroll to latest message */
	autoScroll: boolean
}

// =============================================================================
// Settings State Types
// =============================================================================

/**
 * Settings loading state
 */
export interface SettingsState {
	/** Current preferences */
	preferences: UserPreferences
	/** Loading state */
	isLoading: boolean
	/** Error message if any */
	error: string | null
}

/**
 * Settings context value with actions
 */
export interface SettingsContextValue extends SettingsState {
	/** Update a single preference */
	updatePreference: <K extends keyof UserPreferences>(
		key: K,
		value: UserPreferences[K],
	) => Promise<void>
	/** Reset all preferences to defaults */
	resetPreferences: () => Promise<void>
	/** Whether an update is in progress */
	isUpdating: boolean
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for SettingsSheet component
 */
export interface SettingsSheetProps {
	/** Whether the sheet is open */
	open: boolean
	/** Callback when open state changes */
	onOpenChange: (open: boolean) => void
}

/**
 * Props for SettingsButton component
 */
export interface SettingsButtonProps {
	/** Optional className */
	className?: string
}

/**
 * Props for ThemeToggle component
 */
export interface ThemeToggleProps {
	/** Current theme value */
	value: ThemeMode
	/** Callback when theme changes */
	onChange: (theme: ThemeMode) => void
	/** Whether the toggle is disabled */
	disabled?: boolean
}

/**
 * Props for ModelSelector component
 */
export interface ModelSelectorProps {
	/** Currently selected model ID */
	selectedModelId: string
	/** Available models */
	availableModels?: ModelOption[]
	/** Callback when model changes */
	onModelChange?: (modelId: string) => void
	/** Optional className */
	className?: string
}

// =============================================================================
// Action Types
// =============================================================================

/**
 * Input for updating preferences
 */
export interface UpdatePreferencesInput {
	/** User ID */
	userId: string
	/** Partial preferences to update */
	preferences: Partial<UserPreferences>
}

/**
 * Result of preferences update
 */
export interface UpdatePreferencesResult {
	/** Whether the update was successful */
	success: boolean
	/** Updated preferences if successful */
	preferences?: UserPreferences
	/** Error message if failed */
	error?: string
}

// =============================================================================
// Default Values
// =============================================================================

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
	theme: "system",
	defaultModel: "gpt-4",
	language: "en",
	fontSize: "medium",
	sendOnEnter: true,
	showTimestamps: false,
	compactMode: false,
}

/**
 * Default sampling settings
 */
export const DEFAULT_SAMPLING: SamplingSettings = {
	temperature: 0.7,
	topP: 1,
	maxOutputTokens: 4096,
}

/**
 * Default app settings
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
	selectedModelId: "gpt-4",
	modelSelectorDisplayMode: "full",
	sampling: DEFAULT_SAMPLING,
	systemPrompt: "",
	enableReasoning: false,
	streamArtifacts: true,
	autoScroll: true,
}
