/**
 * Settings Store
 *
 * Zustand store for managing user settings with localStorage persistence.
 * Controls sampling parameters and system prompt for AI chat.
 *
 * @module features/settings/stores/settings-store
 */

"use client";

import { useEffect } from "react";
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
            skipHydration: true, // Prevent SSR hydration mismatch - rehydrate client-side only
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
 * Hook to manually trigger settings rehydration from localStorage.
 * Must be called once on client-side mount to load persisted settings.
 *
 * @example
 * ```tsx
 * // In a client component that mounts early (e.g., layout)
 * useSettingsHydration();
 * ```
 */
export function useSettingsHydration(): void {
    useEffect(() => {
        // Only rehydrate once when the component mounts on the client
        useSettings.persist.rehydrate();
    }, []);
}

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

// =============================================================================
// FINE-GRAINED SELECTORS
// =============================================================================

/**
 * Selector hook for sampling settings only.
 * Use when component only needs sampling values.
 */
export function useSamplingSettings(): SamplingSettings {
    return useSettings((state) => state.sampling);
}

/**
 * Selector hook for auto-scroll setting only.
 */
export function useAutoScrollSetting(): boolean {
    return useSettings((state) => state.autoScroll);
}

/**
 * Selector hook for selected model ID only.
 */
export function useSelectedModelId(): string | undefined {
    return useSettings((state) => state.selectedModelId);
}

/**
 * Selector hook for reasoning toggle only.
 */
export function useEnableReasoningSetting(): boolean {
    return useSettings((state) => state.enableReasoning);
}

/**
 * Selector hook for stream artifacts setting only.
 */
export function useStreamArtifactsSetting(): boolean {
    return useSettings((state) => state.streamArtifacts);
}

/**
 * Selector hook for model selector display mode only.
 */
export function useModelSelectorDisplayMode(): ModelSelectorDisplayMode {
    return useSettings((state) => state.modelSelectorDisplayMode);
}

/**
 * Selector hook for system prompt only.
 */
export function useSystemPromptSetting(): string {
    return useSettings((state) => state.systemPrompt);
}
