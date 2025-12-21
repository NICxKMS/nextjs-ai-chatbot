/**
 * Settings Feature
 *
 * User-configurable settings for AI chat behavior including
 * sampling parameters and system prompt.
 *
 * @module features/settings
 */

// Component exports
export {
    SettingsButton,
    SettingsIconButton,
    SettingsSheet,
} from "./components/settings-sheet";
// Store exports
export {
    type AppSettings,
    DEFAULT_SETTINGS,
    type SamplingSettings,
    type SettingsStore,
    useSettings,
    useSettingsSnapshot,
} from "./stores/settings-store";
