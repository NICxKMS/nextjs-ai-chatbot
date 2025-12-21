/**
 * Settings Feature
 *
 * User-configurable settings for AI chat behavior including
 * sampling parameters and system prompt.
 *
 * @module features/settings
 */

// Store exports
export {
    useSettings,
    useSettingsSnapshot,
    DEFAULT_SETTINGS,
    type AppSettings,
    type SamplingSettings,
    type SettingsStore,
} from "./stores/settings-store";

// Component exports
export {
    SettingsButton,
    SettingsIconButton,
    SettingsSheet,
} from "./components/settings-sheet";
