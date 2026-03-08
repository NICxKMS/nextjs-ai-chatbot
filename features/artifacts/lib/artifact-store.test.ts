// Flow: artifact-state | Step: store-operations
import { afterEach, describe, expect, it, vi } from "vitest"

import { initialArtifactData } from "@/features/artifacts/types/artifact.types"

import { artifactStore } from "./artifact-store"

// ── Helpers ────────────────────────────────────────────────────

/** Reset store to initial state after each test. */
afterEach(() => {
	artifactStore.reset()
})

// ── getSnapshot ────────────────────────────────────────────────

describe("artifactStore.getSnapshot", () => {
	it("returns initial state on startup", () => {
		const state = artifactStore.getSnapshot()
		expect(state).toEqual(initialArtifactData)
	})

	it("returns the same reference when unchanged", () => {
		const a = artifactStore.getSnapshot()
		const b = artifactStore.getSnapshot()
		expect(a).toBe(b)
	})
})

// ── getServerSnapshot ──────────────────────────────────────────

describe("artifactStore.getServerSnapshot", () => {
	it("returns initial artifact data for SSR", () => {
		const state = artifactStore.getServerSnapshot()
		expect(state).toEqual(initialArtifactData)
	})

	it("returns initial data even after setState", () => {
		artifactStore.setState((prev) => ({ ...prev, title: "modified" }))
		expect(artifactStore.getServerSnapshot()).toEqual(initialArtifactData)
	})
})

// ── setState ───────────────────────────────────────────────────

describe("artifactStore.setState", () => {
	it("updates state via updater function", () => {
		artifactStore.setState((prev) => ({ ...prev, title: "New Title" }))
		expect(artifactStore.getSnapshot().title).toBe("New Title")
	})

	it("merges partial updates without losing other fields", () => {
		artifactStore.setState((prev) => ({ ...prev, title: "Title", isVisible: true }))
		const state = artifactStore.getSnapshot()
		expect(state.title).toBe("Title")
		expect(state.isVisible).toBe(true)
		expect(state.kind).toBe("text") // untouched
		expect(state.status).toBe("idle") // untouched
	})

	it("skips emit when updater returns same reference", () => {
		const listener = vi.fn()
		const unsub = artifactStore.subscribe(listener)

		artifactStore.setState((prev) => prev) // no-op

		expect(listener).not.toHaveBeenCalled()
		unsub()
	})
})

// ── subscribe ──────────────────────────────────────────────────

describe("artifactStore.subscribe", () => {
	it("notifies listener on state change", () => {
		const listener = vi.fn()
		const unsub = artifactStore.subscribe(listener)

		artifactStore.setState((prev) => ({ ...prev, title: "Changed" }))

		expect(listener).toHaveBeenCalledTimes(1)
		unsub()
	})

	it("stops notifying after unsubscribe", () => {
		const listener = vi.fn()
		const unsub = artifactStore.subscribe(listener)
		unsub()

		artifactStore.setState((prev) => ({ ...prev, title: "After unsub" }))

		expect(listener).not.toHaveBeenCalled()
	})

	it("supports multiple listeners", () => {
		const listener1 = vi.fn()
		const listener2 = vi.fn()

		const unsub1 = artifactStore.subscribe(listener1)
		const unsub2 = artifactStore.subscribe(listener2)

		artifactStore.setState((prev) => ({ ...prev, title: "Multi" }))

		expect(listener1).toHaveBeenCalledTimes(1)
		expect(listener2).toHaveBeenCalledTimes(1)

		unsub1()
		unsub2()
	})
})

// ── reset ──────────────────────────────────────────────────────

describe("artifactStore.reset", () => {
	it("restores state to initialArtifactData", () => {
		artifactStore.setState((prev) => ({
			...prev,
			title: "Custom",
			isVisible: true,
			status: "streaming",
		}))

		artifactStore.reset()

		expect(artifactStore.getSnapshot()).toEqual(initialArtifactData)
	})

	it("notifies listeners on reset", () => {
		const listener = vi.fn()
		const unsub = artifactStore.subscribe(listener)

		artifactStore.reset()

		expect(listener).toHaveBeenCalledTimes(1)
		unsub()
	})
})

// ── batchUpdate ────────────────────────────────────────────────

describe("artifactStore.batchUpdate", () => {
	it("groups multiple setState calls into one listener notification", () => {
		const listener = vi.fn()
		const unsub = artifactStore.subscribe(listener)

		artifactStore.batchUpdate(() => {
			artifactStore.setState((prev) => ({ ...prev, title: "Batch 1" }))
			artifactStore.setState((prev) => ({ ...prev, isVisible: true }))
			artifactStore.setState((prev) => ({ ...prev, status: "streaming" }))
		})

		// Only 1 notification despite 3 setState calls
		expect(listener).toHaveBeenCalledTimes(1)

		const state = artifactStore.getSnapshot()
		expect(state.title).toBe("Batch 1")
		expect(state.isVisible).toBe(true)
		expect(state.status).toBe("streaming")

		unsub()
	})

	it("still applies state changes inside the batch", () => {
		artifactStore.batchUpdate(() => {
			artifactStore.setState((prev) => ({ ...prev, title: "Inside batch" }))
		})

		expect(artifactStore.getSnapshot().title).toBe("Inside batch")
	})

	it("emits after batch even if fn throws", () => {
		const listener = vi.fn()
		const unsub = artifactStore.subscribe(listener)

		expect(() => {
			artifactStore.batchUpdate(() => {
				artifactStore.setState((prev) => ({ ...prev, title: "Before throw" }))
				throw new Error("batch error")
			})
		}).toThrow("batch error")

		// Should still emit once (finally block)
		expect(listener).toHaveBeenCalledTimes(1)
		expect(artifactStore.getSnapshot().title).toBe("Before throw")

		unsub()
	})

	it("handles nested reset inside batch", () => {
		artifactStore.setState((prev) => ({ ...prev, title: "Pre-batch" }))

		const listener = vi.fn()
		const unsub = artifactStore.subscribe(listener)

		artifactStore.batchUpdate(() => {
			artifactStore.setState((prev) => ({ ...prev, title: "During" }))
			artifactStore.reset()
		})

		expect(listener).toHaveBeenCalledTimes(1)
		expect(artifactStore.getSnapshot()).toEqual(initialArtifactData)

		unsub()
	})
})
