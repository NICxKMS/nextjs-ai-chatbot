"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
    DEFAULT_MAX_OUTPUT_TOKENS,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
} from "@/lib/ai/constants";
import { ChatSDKError } from "@/lib/errors";
import type { AppSettings } from "@/lib/settings/types";

export type { AppSettings } from "@/lib/settings/types";

const SETTINGS_STORAGE_KEY = "chat-sdk.settings";

const DEFAULT_SETTINGS: AppSettings = {
    sampling: {
        temperature: DEFAULT_TEMPERATURE,
        topP: DEFAULT_TOP_P,
        maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    },
    systemPrompt: "",
    enableReasoning: true,
    streamArtifacts: true,
    autoScroll: true,
    selectedModelId: undefined, // Uses server default until user selects
};

export type SettingsStore = {
    settings: AppSettings;
    updateSettings: (updater: (current: AppSettings) => AppSettings) => void;
    resetSettings: () => void;
    /** Update selected model ID and persist to localStorage */
    setSelectedModelId: (modelId: string | undefined) => void;
};

const SettingsContext = createContext<SettingsStore | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useLocalStorage<AppSettings>(
        SETTINGS_STORAGE_KEY,
        DEFAULT_SETTINGS
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

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new ChatSDKError("bad_request:ui:useSettings_outside_provider");
    }
    return context;
}

export function useSettingsSnapshot() {
    return useSettings().settings;
}

export function getDefaultSettings(): AppSettings {
    return DEFAULT_SETTINGS;
}
