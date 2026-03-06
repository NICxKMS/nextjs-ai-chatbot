// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useArtifact } from "@/features/artifacts/hooks/use-artifact"
import { useArtifactSelector } from "@/features/artifacts/hooks/use-artifact-selector"
import { artifactStore } from "@/features/artifacts/lib/artifact-store"
import { initialArtifactData } from "@/features/artifacts/types/artifact.types"

describe("artifact hooks", () => {
	beforeEach(() => {
		artifactStore.reset()
	})

	it("useArtifact returns current store state and stable actions", () => {
		const { result } = renderHook(() => useArtifact())

		expect(result.current.artifact).toEqual(initialArtifactData)
		expect(result.current.setArtifact).toBe(artifactStore.setState)
		expect(result.current.resetArtifact).toBe(artifactStore.reset)
	})

	it("useArtifact updates and resets artifact state", () => {
		const { result } = renderHook(() => useArtifact())

		act(() => {
			result.current.setArtifact((prev) => ({
				...prev,
				title: "Draft",
				isVisible: true,
			}))
		})

		expect(result.current.artifact.title).toBe("Draft")
		expect(result.current.artifact.isVisible).toBe(true)

		act(() => {
			result.current.resetArtifact()
		})

		expect(result.current.artifact).toEqual(initialArtifactData)
	})

	it("useArtifactSelector returns selected slices and updates when selected value changes", () => {
		const { result } = renderHook(() => useArtifactSelector((artifact) => artifact.isVisible))

		expect(result.current).toBe(false)

		act(() => {
			artifactStore.setState((prev) => ({
				...prev,
				isVisible: true,
			}))
		})

		expect(result.current).toBe(true)
	})

	it("useArtifactSelector avoids re-render when unrelated state changes keep selected value stable", () => {
		let renderCount = 0

		const { result } = renderHook(() => {
			renderCount += 1
			return useArtifactSelector((artifact) => artifact.kind)
		})

		const initialRenderCount = renderCount
		expect(result.current).toBe("text")

		act(() => {
			artifactStore.setState((prev) => ({
				...prev,
				title: "Only title changed",
			}))
		})

		expect(result.current).toBe("text")
		expect(renderCount).toBe(initialRenderCount)
	})
})

describe("artifact store", () => {
	beforeEach(() => {
		artifactStore.reset()
	})

	it("returns initial snapshot values for client and server accessors", () => {
		expect(artifactStore.getSnapshot()).toEqual(initialArtifactData)
		expect(artifactStore.getServerSnapshot()).toEqual(initialArtifactData)
	})

	it("notifies subscribers on state changes and stops after unsubscribe", () => {
		const listener = vi.fn<() => void>()
		const unsubscribe = artifactStore.subscribe(listener)

		artifactStore.setState((prev) => ({
			...prev,
			title: "Spec Draft",
			isVisible: true,
		}))

		expect(listener).toHaveBeenCalledTimes(1)
		expect(artifactStore.getSnapshot().title).toBe("Spec Draft")
		expect(artifactStore.getSnapshot().isVisible).toBe(true)

		unsubscribe()

		artifactStore.setState((prev) => ({
			...prev,
			status: "streaming",
		}))

		expect(listener).toHaveBeenCalledTimes(1)
	})

	it("skips emit when updater returns the same state reference", () => {
		const listener = vi.fn<() => void>()
		const unsubscribe = artifactStore.subscribe(listener)

		artifactStore.setState((prev) => prev)

		expect(listener).not.toHaveBeenCalled()
		unsubscribe()
	})

	it("supports content updates through setState", () => {
		const listener = vi.fn<() => void>()
		const unsubscribe = artifactStore.subscribe(listener)

		artifactStore.setState((prev) => ({
			...prev,
			content: `${prev.content}Hello`,
		}))
		artifactStore.setState((prev) => ({
			...prev,
			content: `${prev.content} world`,
		}))

		expect(artifactStore.getSnapshot().content).toBe("Hello world")

		artifactStore.setState((prev) => ({
			...prev,
			content: "const answer = 42",
		}))

		expect(artifactStore.getSnapshot().content).toBe("const answer = 42")
		expect(listener).toHaveBeenCalledTimes(3)

		unsubscribe()
	})

	it("resets to initial data after chained updates", () => {
		artifactStore.setState((prev) => ({
			...prev,
			title: "My Artifact",
			status: "streaming",
			isVisible: true,
		}))
		artifactStore.setState((prev) => ({
			...prev,
			content: `${prev.content}delta`,
		}))
		artifactStore.setState((prev) => ({
			...prev,
			title: `${prev.title} v2`,
		}))

		expect(artifactStore.getSnapshot()).toMatchObject({
			title: "My Artifact v2",
			status: "streaming",
			isVisible: true,
			content: "delta",
		})

		artifactStore.reset()

		expect(artifactStore.getSnapshot()).toEqual(initialArtifactData)
	})
})
