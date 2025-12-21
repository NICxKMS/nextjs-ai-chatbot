/**
 * Settings Store
 *
 * Zustand store for managing user settings with localStorage persistence.
 * Controls sampling parameters and system prompt for AI chat.
 *
 * @module features/settings/stores/settings-store
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Display mode for the model selector.
 * - "compact": Just model name
 * - "detailed": Model name + provider + capabilities
 */
export type ModelSelectorDisplayMode = "compact" | "detailed";

/**
 * Sampling settings for AI model configuration.
 */
export type SamplingSettings = {
    /** Controls randomness in responses (0-2) */
    temperature: number;
    /** Nucleus sampling threshold (0-1) */
    topP: number;
    /** Maximum tokens in response */
    maxOutputTokens: number;
};

/**
 * Application settings state.
 */
export type AppSettings = {
    sampling: SamplingSettings;
    systemPrompt: string;
    enableReasoning: boolean;
    streamArtifacts: boolean;
    autoScroll: boolean;
    selectedModelId?: string;
    modelSelectorDisplayMode: ModelSelectorDisplayMode;
};

/**
 * Settings store actions.
 */
type SettingsActions = {
    updateSettings: (updater: (current: AppSettings) => AppSettings) => void;
    updateSampling: (partial: Partial<SamplingSettings>) => void;
    setSystemPrompt: (prompt: string) => void;
    setEnableReasoning: (value: boolean) => void;
    setStreamArtifacts: (value: boolean) => void;
    setAutoScroll: (value: boolean) => void;
    setSelectedModelId: (modelId: string | undefined) => void;
    setModelSelectorDisplayMode: (mode: ModelSelectorDisplayMode) => void;
    resetSettings: () => void;
};

/**
 * Complete settings store type.
 */
export type SettingsStore = AppSettings & SettingsActions;

/**
 * Default settings values.
 */
export const DEFAULT_SETTINGS: AppSettings = {
    sampling: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 4096,
    },
    systemPrompt: "",
    enableReasoning: true,
    streamArtifacts: true,
    autoScroll: true,
    selectedModelId: undefined,
    modelSelectorDisplayMode: "compact",
};

/**
 * Settings store with localStorage persistence.
 *
 * @example
 * ```tsx
 * const { sampling, updateSampling } = useSettings();
 * updateSampling({ temperature: 0.8 });
 * ```
 */
export const useSettings = create<SettingsStore>()(
    persist(
        (set) => ({
            ...DEFAULT_SETTINGS,

            updateSettings: (updater) =>
                set((state) => {
                    const current: AppSettings = {
                        sampling: state.sampling,
                        systemPrompt: state.systemPrompt,
                        enableReasoning: state.enableReasoning,
                        streamArtifacts: state.streamArtifacts,
                        autoScroll: state.autoScroll,
                        selectedModelId: state.selectedModelId,
                        modelSelectorDisplayMode:
                            state.modelSelectorDisplayMode,
                    };
                    return updater(current);
                }),

            updateSampling: (partial) =>
                set((state) => ({
                    sampling: { ...state.sampling, ...partial },
                })),

            setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

            setEnableReasoning: (value) => set({ enableReasoning: value }),

            setStreamArtifacts: (value) => set({ streamArtifacts: value }),

            setAutoScroll: (value) => set({ autoScroll: value }),

            setSelectedModelId: (modelId) => set({ selectedModelId: modelId }),

            setModelSelectorDisplayMode: (mode) =>
                set({ modelSelectorDisplayMode: mode }),

            resetSettings: () => set(DEFAULT_SETTINGS),
        }),
        {
            name: "chat-sdk.settings",
            partialize: (state) => ({
                sampling: state.sampling,
                systemPrompt: state.systemPrompt,
                enableReasoning: state.enableReasoning,
                streamArtifacts: state.streamArtifacts,
                autoScroll: state.autoScroll,
                selectedModelId: state.selectedModelId,
                modelSelectorDisplayMode: state.modelSelectorDisplayMode,
            }),
        }
    )
);

/**
 * Hook to get only the settings values (snapshot).
 */
export function useSettingsSnapshot(): AppSettings {
    return useSettings((state) => ({
        sampling: state.sampling,
        systemPrompt: state.systemPrompt,
        enableReasoning: state.enableReasoning,
        streamArtifacts: state.streamArtifacts,
        autoScroll: state.autoScroll,
        selectedModelId: state.selectedModelId,
        modelSelectorDisplayMode: state.modelSelectorDisplayMode,
    }));
}
