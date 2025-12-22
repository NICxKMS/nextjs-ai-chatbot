/**
 * Settings Feature
 *
 * User-configurable settings for AI chat behavior including
 * sampling parameters and system prompt.
 *
 * @module features/settings
 */

export { SettingsHydration } from "./components/settings-hydration";
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
    type ModelSelectorDisplayMode,
    type SamplingSettings,
    type SettingsStore,
    useSettings,
    useSettingsHydration,
    useSettingsSnapshot,
} from "./stores/settings-store";
