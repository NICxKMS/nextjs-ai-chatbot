"use client"

import { useSyncExternalStore } from "react"
import { settingsSchema } from "@/features/settings/schemas/settings.schema"
import type { SettingsState } from "@/features/settings/types/settings.types"
import { DEFAULT_SETTINGS } from "@/features/settings/types/settings.types"

// ── Module-level store ──────────────────────────────────────
// No provider needed — hooks import directly from this module.
// Settings persist to localStorage and sync across tabs via StorageEvent.

const STORAGE_KEY = "chat-settings"
let state: SettingsState = DEFAULT_SETTINGS
const listeners = new Set<() => void>()
const partialSettingsSchema = settingsSchema.partial()
let hasStorageListener = false

function parseStoredSettings(value: string): SettingsState | null {
	try {
		const parsed = JSON.parse(value)
		const result = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...parsed })
		return result.success ? result.data : null
	} catch {
		return null
	}
}

function setState(nextState: SettingsState): void {
	state = nextState
	emitChange()
}

function syncStoredSettings(value: string | null): void {
	if (value === null) {
		setState(DEFAULT_SETTINGS)
		return
	}

	const nextState = parseStoredSettings(value)
	if (nextState) {
		setState(nextState)
	}
}

function handleStorageEvent(event: StorageEvent): void {
	if (event.key !== STORAGE_KEY) return
	syncStoredSettings(event.newValue)
}

function ensureStorageListener(): void {
	if (hasStorageListener || typeof window === "undefined") return
	window.addEventListener("storage", handleStorageEvent)
	hasStorageListener = true
}

function cleanupStorageListener(): void {
	if (!hasStorageListener || listeners.size > 0 || typeof window === "undefined") return
	window.removeEventListener("storage", handleStorageEvent)
	hasStorageListener = false
}

// Initialize from localStorage (client-only, runs once at module load)
if (typeof window !== "undefined") {
	const storedSettings = localStorage.getItem(STORAGE_KEY)
	if (storedSettings) {
		state = parseStoredSettings(storedSettings) ?? DEFAULT_SETTINGS
	}
}

function emitChange(): void {
	for (const listener of listeners) {
		listener()
	}
}

// ── Store API (public for non-React consumers) ─────────────

function updateSettings(partial: Partial<SettingsState>): boolean {
	const result = partialSettingsSchema.safeParse(partial)
	if (!result.success) return false

	const nextState = { ...state, ...result.data }
	localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
	setState(nextState)
	return true
}

function resetSettings(): void {
	localStorage.removeItem(STORAGE_KEY)
	setState(DEFAULT_SETTINGS)
}

export const settingsStore = {
	getSnapshot(): SettingsState {
		return state
	},

	getServerSnapshot(): SettingsState {
		return DEFAULT_SETTINGS
	},

	subscribe(listener: () => void): () => void {
		listeners.add(listener)
		ensureStorageListener()

		return () => {
			listeners.delete(listener)
			cleanupStorageListener()
		}
	},

	updateSettings,
	resetSettings,
} as const

// ── Hooks ───────────────────────────────────────────────────

// Stable actions object — returned directly by useSettingsSetter (no subscription needed).
const actions = { updateSettings, resetSettings } as const

export function useSettingsSelector<Selected>(
	selector: (settings: SettingsState) => Selected,
): Selected {
	return useSyncExternalStore(
		settingsStore.subscribe,
		() => selector(settingsStore.getSnapshot()),
		() => selector(settingsStore.getServerSnapshot()),
	)
}

/**
 * Read-only hook — returns the current settings snapshot.
 * Re-renders when any setting changes (including cross-tab sync).
 *
 * @deprecated Prefer `useSettingsSelector` with a specific selector to avoid
 * unnecessary re-renders. This hook subscribes to the entire settings object,
 * causing re-renders on any setting change.
 */
export function useSettings(): SettingsState {
	return useSettingsSelector((settings) => settings)
}

/**
 * Write-only hook — returns stable `updateSettings` and `resetSettings` functions.
 * No subscription needed — actions are module-level stable references that never change.
 */
export function useSettingsSetter(): {
	updateSettings: typeof updateSettings
	resetSettings: typeof resetSettings
} {
	return actions
}
