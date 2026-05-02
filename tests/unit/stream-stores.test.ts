import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { artifactStore } from "@/features/artifacts/lib/artifact-store"
import {
	collapseReplaceDeltas,
	DEFAULT_ARTIFACT,
	processStreamDelta,
} from "@/features/chat/lib/process-stream-deltas"
import type { DataPart } from "@/features/chat/types/chat.types"
import { DEFAULT_SETTINGS } from "@/features/settings/types/settings.types"
import type { ArtifactKind } from "@/lib/types/artifact.types"

function createMemoryStorage() {
	const store = new Map<string, string>()
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => store.set(key, value),
		removeItem: (key: string) => store.delete(key),
		clear: () => store.clear(),
	}
}

async function loadSettingsStore(storedValue: string | null) {
	vi.resetModules()
	vi.stubGlobal("window", {})
	const storage = createMemoryStorage()
	if (storedValue !== null) {
		storage.setItem("chat-settings", storedValue)
	}
	vi.stubGlobal("localStorage", storage)

	const { settingsStore } = await import("@/features/settings/hooks/use-settings")
	return settingsStore
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("stream delta processing", () => {
	it("applies artifact lifecycle and content semantics", () => {
		let current = processStreamDelta(
			{ type: "artifact-id", content: "artifact-1" },
			DEFAULT_ARTIFACT,
		)
		current = processStreamDelta({ type: "artifact-title", content: "Title" }, current)
		current = processStreamDelta({ type: "artifact-textDelta", content: "Hello" }, current)
		current = processStreamDelta({ type: "artifact-textDelta", content: " world" }, current)
		current = processStreamDelta({ type: "artifact-codeDelta", content: "print(1)" }, current)
		current = processStreamDelta({ type: "artifact-finish", content: "" }, current)

		expect(current).toMatchObject({
			artifactId: "artifact-1",
			title: "Title",
			content: "print(1)",
			isVisible: true,
			status: "idle",
		})
	})

	it("keeps only the last replace-semantic delta per type", () => {
		const deltas: DataPart[] = [
			{ type: "artifact-codeDelta", content: "a" },
			{ type: "artifact-textDelta", content: "keep" },
			{ type: "artifact-codeDelta", content: "b" },
			{ type: "artifact-sheetDelta", content: "one" },
			{ type: "artifact-sheetDelta", content: "two" },
			{ type: "artifact-imageDelta", content: "old-image" },
			{ type: "artifact-imageDelta", content: "new-image" },
		]

		expect(collapseReplaceDeltas(deltas)).toEqual([
			{ type: "artifact-textDelta", content: "keep" },
			{ type: "artifact-codeDelta", content: "b" },
			{ type: "artifact-sheetDelta", content: "two" },
			{ type: "artifact-imageDelta", content: "new-image" },
		])
	})

	it("appends text deltas while replacing code sheet and image deltas", () => {
		let current = { ...DEFAULT_ARTIFACT, content: "base" }

		current = processStreamDelta({ type: "artifact-textDelta", content: " plus" }, current)
		expect(current.content).toBe("base plus")

		current = processStreamDelta(
			{ type: "artifact-codeDelta", content: "const value = 1" },
			current,
		)
		expect(current.content).toBe("const value = 1")

		current = processStreamDelta(
			{ type: "artifact-sheetDelta", content: "name,value" },
			current,
		)
		expect(current.content).toBe("name,value")

		current = processStreamDelta(
			{ type: "artifact-imageDelta", content: "data:image/png;base64,abc" },
			current,
		)
		expect(current.content).toBe("data:image/png;base64,abc")
	})

	it("covers all plan-mapped artifact and non-artifact stream parts", () => {
		let current = processStreamDelta(
			{ type: "artifact-kind", content: "image" },
			{ ...DEFAULT_ARTIFACT, content: "previous", suggestions: [] },
		)
		current = processStreamDelta({ type: "artifact-imageDelta", content: "image-url" }, current)
		current = processStreamDelta(
			{
				type: "artifact-suggestion",
				content: {
					originalText: "old",
					suggestedText: "new",
					description: "Improve wording",
				},
			},
			current,
		)

		expect(current).toMatchObject({
			kind: "image",
			content: "image-url",
			suggestions: [
				{
					originalText: "old",
					suggestedText: "new",
					description: "Improve wording",
				},
			],
		})

		const afterClear = processStreamDelta({ type: "artifact-clear", content: "" }, current)
		expect(afterClear).toMatchObject({ content: "", suggestions: [] })

		expect(processStreamDelta({ type: "chat-title", content: "Title" }, afterClear)).toBe(
			afterClear,
		)
		expect(processStreamDelta({ type: "usage", content: "{}" }, afterClear)).toBe(afterClear)
		expect(processStreamDelta({ type: "error", content: "Failed" }, afterClear)).toBe(
			afterClear,
		)
	})
})

describe("artifactStore", () => {
	beforeEach(() => artifactStore.reset())

	it("notifies subscribers once for batched updates", () => {
		const listener = vi.fn()
		const unsubscribe = artifactStore.subscribe(listener)

		artifactStore.batchUpdate(() => {
			artifactStore.setState((state) => ({ ...state, artifactId: "a1" }))
			artifactStore.setState((state) => ({ ...state, title: "Artifact" }))
		})

		expect(listener).toHaveBeenCalledTimes(1)
		expect(artifactStore.getSnapshot()).toMatchObject({ artifactId: "a1", title: "Artifact" })
		unsubscribe()
	})

	it("coerces invalid artifact kinds at the store boundary", () => {
		artifactStore.setState((state) => ({
			...state,
			kind: "invalid-kind" as unknown as ArtifactKind,
		}))

		expect(artifactStore.getSnapshot().kind).toBe("text")
	})
})

describe("settingsStore", () => {
	it("initializes from persisted settings and keeps default context display mode", async () => {
		const settingsStore = await loadSettingsStore(
			JSON.stringify({ temperature: 1.1, systemPrompt: "Persisted prompt." }),
		)

		expect(settingsStore.getSnapshot()).toEqual({
			...DEFAULT_SETTINGS,
			temperature: 1.1,
			systemPrompt: "Persisted prompt.",
		})
	})

	it("falls back to default settings for invalid stored JSON and schema-invalid settings", async () => {
		const invalidJsonStore = await loadSettingsStore("{invalid json")
		expect(invalidJsonStore.getSnapshot()).toEqual(DEFAULT_SETTINGS)

		const invalidSchemaStore = await loadSettingsStore(
			JSON.stringify({ temperature: 3, contextDisplayMode: "detailed" }),
		)
		expect(invalidSchemaStore.getSnapshot()).toEqual(DEFAULT_SETTINGS)
	})

	it("persists valid partial updates and rejects invalid ones", async () => {
		vi.resetModules()
		vi.stubGlobal("localStorage", createMemoryStorage())

		const { settingsStore } = await import("@/features/settings/hooks/use-settings")

		expect(settingsStore.updateSettings({ temperature: 1.2 })).toBe(true)
		expect(settingsStore.getSnapshot().temperature).toBe(1.2)
		expect(localStorage.getItem("chat-settings")).toContain('"temperature":1.2')
		expect(settingsStore.updateSettings({ temperature: 3 })).toBe(false)
		expect(settingsStore.getSnapshot().temperature).toBe(1.2)

		settingsStore.resetSettings()
		expect(settingsStore.getSnapshot()).toEqual(DEFAULT_SETTINGS)
		expect(localStorage.getItem("chat-settings")).toBeNull()
		vi.unstubAllGlobals()
	})

	it("syncs valid storage events across subscribers and cleans up listeners", async () => {
		vi.resetModules()
		vi.stubGlobal("localStorage", createMemoryStorage())
		const storageListeners = new Set<(event: StorageEvent) => void>()
		vi.stubGlobal("window", {
			addEventListener(type: string, listener: EventListener) {
				if (type === "storage")
					storageListeners.add(listener as (event: StorageEvent) => void)
			},
			removeEventListener(type: string, listener: EventListener) {
				if (type === "storage")
					storageListeners.delete(listener as (event: StorageEvent) => void)
			},
		})

		const { settingsStore } = await import("@/features/settings/hooks/use-settings")
		const listener = vi.fn()
		const unsubscribe = settingsStore.subscribe(listener)

		localStorage.setItem(
			"chat-settings",
			JSON.stringify({ temperature: 0.4, systemPrompt: "Use terse replies." }),
		)
		for (const storageListener of storageListeners) {
			storageListener({
				key: "chat-settings",
				newValue: localStorage.getItem("chat-settings"),
			} as StorageEvent)
		}

		expect(settingsStore.getSnapshot()).toMatchObject({
			temperature: 0.4,
			systemPrompt: "Use terse replies.",
		})
		expect(listener).toHaveBeenCalledTimes(1)

		for (const storageListener of storageListeners) {
			storageListener({ key: "chat-settings", newValue: null } as StorageEvent)
		}
		expect(settingsStore.getSnapshot()).toEqual(DEFAULT_SETTINGS)

		unsubscribe()
		expect(storageListeners.size).toBe(0)
		vi.unstubAllGlobals()
	})
})
