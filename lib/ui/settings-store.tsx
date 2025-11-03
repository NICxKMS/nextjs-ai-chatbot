"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import type { AppSettings } from "@/lib/settings/types";

export type { AppSettings } from "@/lib/settings/types";

const SETTINGS_STORAGE_KEY = "chat-sdk.settings";

const DEFAULT_SETTINGS: AppSettings = {
	sampling: {
		temperature: 0.7,
		topP: 1,
		maxOutputTokens: 4096,
	},
	systemPrompt: "",
	enableReasoning: true,
	streamArtifacts: true,
	autoScroll: true,
};

export type SettingsStore = {
	settings: AppSettings;
	updateSettings: (updater: (current: AppSettings) => AppSettings) => void;
	resetSettings: () => void;
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
		throw new Error("useSettings must be used within a SettingsProvider");
	}
	return context;
}

export function useSettingsSnapshot() {
	return useSettings().settings;
}

export function getDefaultSettings(): AppSettings {
	return DEFAULT_SETTINGS;
}
