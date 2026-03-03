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

// Initialize from localStorage (client-only, runs once at module load)
if (typeof window !== "undefined") {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored) {
			const parsed = JSON.parse(stored)
			const result = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...parsed })
			state = result.success ? result.data : DEFAULT_SETTINGS
		}
	} catch {
		// Corrupted localStorage — fall back to defaults
	}
}

function emitChange(): void {
	for (const listener of listeners) {
		listener()
	}
}

// ── Store API (public for non-React consumers) ─────────────

function updateSettings(partial: Partial<SettingsState>): boolean {
	const result = settingsSchema.partial().safeParse(partial)
	if (!result.success) return false

	state = { ...state, ...result.data }
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	emitChange()
	return true
}

function resetSettings(): void {
	state = DEFAULT_SETTINGS
	localStorage.removeItem(STORAGE_KEY)
	emitChange()
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
			if (e.newValue) {
				try {
					const parsed = JSON.parse(e.newValue)
					const result = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...parsed })
					if (result.success) {
						state = result.data
						emitChange()
					}
				} catch {
					// Ignore malformed data from other tabs
				}
			} else {
				// Key was removed in another tab
				state = DEFAULT_SETTINGS
				emitChange()
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

// Stable actions object — never changes, so useSyncExternalStore never triggers re-render
const actions = { updateSettings, resetSettings } as const
function getActionsSnapshot() {
	return actions
}

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
 * Never triggers re-renders (actions are stable references).
 */
export function useSettingsSetter(): {
	updateSettings: typeof updateSettings
	resetSettings: typeof resetSettings
} {
	return useSyncExternalStore(settingsStore.subscribe, getActionsSnapshot, getActionsSnapshot)
}
