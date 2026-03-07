// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import {
	settingsStore,
	useSettings,
	useSettingsSelector,
	useSettingsSetter,
} from "@/features/settings/hooks/use-settings"
import { DEFAULT_SETTINGS } from "@/features/settings/types/settings.types"

const STORAGE_KEY = "chat-settings"

describe("settings hooks", () => {
	beforeEach(() => {
		localStorage.clear()
		settingsStore.resetSettings()
	})

	it("returns default settings when store is reset", () => {
		const { result } = renderHook(() => useSettings())

		expect(result.current).toEqual(DEFAULT_SETTINGS)
	})

	it("updates settings through useSettingsSetter and persists to localStorage", () => {
		const { result } = renderHook(() => ({
			settings: useSettings(),
			actions: useSettingsSetter(),
		}))

		act(() => {
			const success = result.current.actions.updateSettings({
				temperature: 1.1,
				contextDisplayMode: "detailed",
			})
			expect(success).toBe(true)
		})

		expect(result.current.settings.temperature).toBe(1.1)
		expect(result.current.settings.contextDisplayMode).toBe("detailed")

		const savedRaw = localStorage.getItem(STORAGE_KEY)
		expect(savedRaw).not.toBeNull()

		const saved = JSON.parse(savedRaw ?? "{}") as {
			temperature?: number
			contextDisplayMode?: string
		}
		expect(saved.temperature).toBe(1.1)
		expect(saved.contextDisplayMode).toBe("detailed")
	})

	it("rejects invalid partial updates", () => {
		const { result } = renderHook(() => ({
			settings: useSettings(),
			actions: useSettingsSetter(),
		}))

		act(() => {
			const success = result.current.actions.updateSettings({
				temperature: 5,
			})
			expect(success).toBe(false)
		})

		expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
	})

	it("resets settings to defaults and removes persisted state", () => {
		const { result } = renderHook(() => ({
			settings: useSettings(),
			actions: useSettingsSetter(),
		}))

		act(() => {
			result.current.actions.updateSettings({
				systemPrompt: "You are concise.",
				enableReasoning: true,
			})
		})

		act(() => {
			result.current.actions.resetSettings()
		})

		expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
	})

	it("syncs settings from storage events and handles removals", () => {
		const { result } = renderHook(() => useSettings())

		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: STORAGE_KEY,
					newValue: JSON.stringify({
						...DEFAULT_SETTINGS,
						topP: 0.4,
					}),
				}),
			)
		})

		expect(result.current.topP).toBe(0.4)

		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: STORAGE_KEY,
					newValue: null,
				}),
			)
		})

		expect(result.current).toEqual(DEFAULT_SETTINGS)
	})

	it("selector subscribers ignore unrelated setting updates", () => {
		let renderCount = 0

		const { result } = renderHook(() => {
			renderCount += 1
			return useSettingsSelector((settings) => settings.temperature)
		})

		expect(result.current).toBe(DEFAULT_SETTINGS.temperature)
		expect(renderCount).toBe(1)

		act(() => {
			const success = settingsStore.updateSettings({ topP: 0.4 })
			expect(success).toBe(true)
		})

		expect(result.current).toBe(DEFAULT_SETTINGS.temperature)
		expect(renderCount).toBe(1)

		act(() => {
			const success = settingsStore.updateSettings({ temperature: 1.25 })
			expect(success).toBe(true)
		})

		expect(result.current).toBe(1.25)
		expect(renderCount).toBe(2)
	})
})
