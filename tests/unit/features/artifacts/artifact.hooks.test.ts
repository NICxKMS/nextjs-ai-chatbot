// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

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
