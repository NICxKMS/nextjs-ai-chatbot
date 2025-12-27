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
    // Fine-grained selectors for optimized renders
    useAutoScrollSetting,
    useEnableReasoningSetting,
    useModelSelectorDisplayMode,
    useSamplingSettings,
    useSelectedModelId,
    useSettings,
    useSettingsHydration,
    useSettingsSnapshot,
    useStreamArtifactsSetting,
    useSystemPromptSetting,
} from "./stores/settings-store";
