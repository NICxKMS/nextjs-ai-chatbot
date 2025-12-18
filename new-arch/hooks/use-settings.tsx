"use client";

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useMemo,
} from "react";
import { useLocalStorage } from "usehooks-ts";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Zod Schema
// ─────────────────────────────────────────────────────────────

const samplingSettingsSchema = z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    topP: z.number().min(0).max(1).default(0.9),
    maxOutputTokens: z.number().min(1).max(128_000).default(4096),
});

const appSettingsSchema = z.object({
    sampling: samplingSettingsSchema.default({
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 4096,
    }),
    systemPrompt: z.string().default(""),
    enableReasoning: z.boolean().default(true),
    streamArtifacts: z.boolean().default(true),
    autoScroll: z.boolean().default(true),
    selectedModelId: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type SamplingSettings = z.infer<typeof samplingSettingsSchema>;

export type AppSettings = z.infer<typeof appSettingsSchema>;

export type SettingsStore = {
    settings: AppSettings;
    updateSettings: (updater: (current: AppSettings) => AppSettings) => void;
    resetSettings: () => void;
    setSelectedModelId: (modelId: string | undefined) => void;
    /** Update a single setting value */
    setSetting: <TSettingKey extends keyof AppSettings>(
        key: TSettingKey,
        value: AppSettings[TSettingKey]
    ) => void;
    /** Update sampling settings */
    updateSampling: (sampling: Partial<SamplingSettings>) => void;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "chat-sdk.settings";

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

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
    selectedModelId: undefined,
};

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsStore | undefined>(undefined);

// ─────────────────────────────────────────────────────────────
// Validation Helper
// ─────────────────────────────────────────────────────────────

/**
 * Validates and sanitizes settings loaded from storage.
 * Returns validated settings or defaults if validation fails.
 */
function validateSettings(stored: unknown, defaults: AppSettings): AppSettings {
    const result = appSettingsSchema.safeParse(stored);
    if (!result.success) {
        console.warn(
            "Invalid settings detected, using defaults:",
            result.error.flatten()
        );
        return defaults;
    }
    return result.data;
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export type SettingsProviderProps = {
    children: ReactNode;
    /** Override default settings (useful for testing) */
    defaultSettings?: AppSettings;
};

/**
 * Provider for user settings with localStorage persistence and Zod validation.
 */
export function SettingsProvider({
    children,
    defaultSettings = DEFAULT_SETTINGS,
}: SettingsProviderProps) {
    const [rawSettings, setSettings] = useLocalStorage<AppSettings>(
        STORAGE_KEY,
        defaultSettings,
        {
            initializeWithValue: false,
        }
    );

    // Validate settings on every access to ensure type safety
    const settings = useMemo(
        () => validateSettings(rawSettings, defaultSettings),
        [rawSettings, defaultSettings]
    );

    const updateSettings = useCallback(
        (updater: (current: AppSettings) => AppSettings) => {
            setSettings((previous) => {
                const updated = updater(previous ?? defaultSettings);
                // Validate before saving to ensure data integrity
                return validateSettings(updated, defaultSettings);
            });
        },
        [setSettings, defaultSettings]
    );

    const resetSettings = useCallback(() => {
        setSettings(defaultSettings);
    }, [setSettings, defaultSettings]);

    const setSelectedModelId = useCallback(
        (modelId: string | undefined) => {
            setSettings((previous) => {
                const updated = {
                    ...(previous ?? defaultSettings),
                    selectedModelId: modelId,
                };
                return validateSettings(updated, defaultSettings);
            });
        },
        [setSettings, defaultSettings]
    );

    const setSetting: SettingsStore["setSetting"] = useCallback(
        (settingKey, settingValue) => {
            setSettings((previous) => {
                const updated = {
                    ...(previous ?? defaultSettings),
                    [settingKey]: settingValue,
                };
                return validateSettings(updated, defaultSettings);
            });
        },
        [setSettings, defaultSettings]
    );

    const updateSampling = useCallback(
        (sampling: Partial<SamplingSettings>) => {
            setSettings((previous) => {
                const updated = {
                    ...(previous ?? defaultSettings),
                    sampling: {
                        ...(previous ?? defaultSettings).sampling,
                        ...sampling,
                    },
                };
                return validateSettings(updated, defaultSettings);
            });
        },
        [setSettings, defaultSettings]
    );

    const value = useMemo<SettingsStore>(
        () => ({
            settings,
            updateSettings,
            resetSettings,
            setSelectedModelId,
            setSetting,
            updateSampling,
        }),
        [
            settings,
            updateSettings,
            resetSettings,
            setSelectedModelId,
            setSetting,
            updateSampling,
        ]
    );

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

// ─────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────

/**
 * Access the full settings store.
 *
 * @throws Error if used outside SettingsProvider
 */
export function useSettings(): SettingsStore {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within SettingsProvider");
    }
    return context;
}

/**
 * Access only the settings values (read-only snapshot).
 * Use this when you only need to read settings, not update them.
 */
export function useSettingsSnapshot(): AppSettings {
    return useSettings().settings;
}

/**
 * Access a single setting value.
 */
export function useSetting<K extends keyof AppSettings>(
    key: K
): AppSettings[K] {
    const settings = useSettingsSnapshot();
    return settings[key];
}

/**
 * Get default settings (for reset or comparison).
 */
export function getDefaultSettings(): AppSettings {
    return DEFAULT_SETTINGS;
}
