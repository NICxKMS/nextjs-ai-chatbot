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

		// Cross-tab sync via StorageEvent
		const handler = (e: StorageEvent) => {
			if (e.key !== STORAGE_KEY) return
			if (e.newValue === null) {
				// Key was removed in another tab
				setState(DEFAULT_SETTINGS)
				return
			}

			const nextState = parseStoredSettings(e.newValue)
			if (nextState) {
				setState(nextState)
			}
		}
		window.addEventListener("storage", handler)

		return () => {
			listeners.delete(listener)
			window.removeEventListener("storage", handler)
		}
	},

	updateSettings,
	resetSettings,
} as const

// ── Hooks ───────────────────────────────────────────────────

// Stable actions object — returned directly by useSettingsSetter (no subscription needed).
const actions = { updateSettings, resetSettings } as const

/**
 * Read-only hook — returns the current settings snapshot.
 * Re-renders when any setting changes (including cross-tab sync).
 */
export function useSettings(): SettingsState {
	return useSyncExternalStore(
		settingsStore.subscribe,
		settingsStore.getSnapshot,
		settingsStore.getServerSnapshot,
	)
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
