/**
 * Settings Store
 * @module new-arch/lib/ui/settings-store
 *
 * Provides user settings context and persistence via localStorage.
 */

"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";

// =============================================================================
// TYPES
// =============================================================================

export type SamplingSettings = {
    temperature: number;
    topP: number;
    maxOutputTokens: number;
};

export type AppSettings = {
    sampling: SamplingSettings;
    systemPrompt: string;
    enableReasoning: boolean;
    streamArtifacts: boolean;
    autoScroll: boolean;
    selectedModelId?: string;
};

// Alias for compatibility
export type Settings = AppSettings;

export type SettingsStore = {
    settings: AppSettings;
    updateSettings: (updater: (current: AppSettings) => AppSettings) => void;
    resetSettings: () => void;
    setSelectedModelId: (modelId: string | undefined) => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const SETTINGS_STORAGE_KEY = "chat-sdk.settings";

const DEFAULT_SETTINGS: AppSettings = {
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
};

// =============================================================================
// CONTEXT
// =============================================================================

const SettingsContext = createContext<SettingsStore | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useLocalStorage<AppSettings>(
        SETTINGS_STORAGE_KEY,
        DEFAULT_SETTINGS,
        { initializeWithValue: false }
    );

    const value = useMemo<SettingsStore>(
        () => ({
            settings,
            updateSettings(updater) {
                setSettings((previous) =>
                    updater(previous ?? DEFAULT_SETTINGS)
                );
            },
            resetSettings() {
                setSettings(DEFAULT_SETTINGS);
            },
            setSelectedModelId(modelId) {
                setSettings((previous) => ({
                    ...(previous ?? DEFAULT_SETTINGS),
                    selectedModelId: modelId,
                }));
            },
        }),
        [settings, setSettings]
    );

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

// =============================================================================
// HOOKS
// =============================================================================

export function useSettings(): SettingsStore {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error(
            "useSettings must be used within a SettingsProvider"
        );
    }
    return context;
}

export function useSettingsSnapshot(): AppSettings {
    return useSettings().settings;
}

// =============================================================================
// UTILITIES
// =============================================================================

export function getDefaultSettings(): AppSettings {
    return DEFAULT_SETTINGS;
}
