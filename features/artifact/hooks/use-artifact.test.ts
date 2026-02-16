/**
 * Tests for useArtifact Hooks
 *
 * Unit tests for artifact state management hooks.
 *
 * @module features/artifact/hooks/use-artifact.test
 */

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ArtifactMetadata, UIArtifact } from "../types"
import {
	initialArtifactData,
	useArtifact,
	useArtifactSelector,
} from "./use-artifact"

// =============================================================================
// Mocks
// =============================================================================

// Mock SWR
let mockData: UIArtifact | undefined
const mockMutate = vi.fn()

vi.mock("swr", () => ({
	default: vi.fn(
		(
			_key: string,
			_fetcher: null,
			options: { fallbackData?: UIArtifact },
		) => ({
			data: mockData ?? options?.fallbackData,
			mutate: mockMutate,
		}),
	),
}))

// =============================================================================
// Test Fixtures
// =============================================================================

const createTestArtifact = (
	overrides: Partial<UIArtifact> = {},
): UIArtifact => ({
	documentId: "doc-123",
	title: "Test Document",
	kind: "text",
	content: "Test content",
	isVisible: true,
	status: "idle",
	boundingBox: { top: 0, left: 0, width: 100, height: 100 },
	...overrides,
})

// =============================================================================
// Tests
// =============================================================================

describe("useArtifact", () => {
	beforeEach(() => {
		mockData = undefined
		vi.clearAllMocks()
	})

	// ---------------------------------------------------------------------------
	// Initial State Tests
	// ---------------------------------------------------------------------------

	describe("initial state", () => {
		it("should return initial artifact data by default", () => {
			const { result } = renderHook(() => useArtifact())

			expect(result.current.artifact).toEqual(initialArtifactData)
		})

		it("should return existing artifact data if present", () => {
			const testArtifact = createTestArtifact()
			mockData = testArtifact

			const { result } = renderHook(() => useArtifact())

			expect(result.current.artifact).toEqual(testArtifact)
		})

		it("should have null metadata initially", () => {
			const { result } = renderHook(() => useArtifact())

			expect(result.current.metadata).toBeNull()
		})
	})

	// ---------------------------------------------------------------------------
	// Set Artifact Tests
	// ---------------------------------------------------------------------------

	describe("setArtifact", () => {
		it("should set artifact with direct value", () => {
			const { result } = renderHook(() => useArtifact())

			const newArtifact = createTestArtifact({ documentId: "new-doc" })

			act(() => {
				result.current.setArtifact(newArtifact)
			})

			expect(mockMutate).toHaveBeenCalled()
		})

		it("should set artifact with updater function", () => {
			mockData = createTestArtifact({ documentId: "existing-doc" })

			const { result } = renderHook(() => useArtifact())

			act(() => {
				result.current.setArtifact((current) => ({
					...current,
					title: "Updated Title",
				}))
			})

			expect(mockMutate).toHaveBeenCalled()
		})

		it("should use initialArtifactData as fallback in updater", () => {
			const { result } = renderHook(() => useArtifact())

			act(() => {
				result.current.setArtifact((current) => ({
					...current,
					documentId: "new-doc",
				}))
			})

			expect(mockMutate).toHaveBeenCalled()
		})
	})

	// ---------------------------------------------------------------------------
	// Metadata Tests
	// ---------------------------------------------------------------------------

	describe("metadata", () => {
		it("should set metadata", () => {
			const { result } = renderHook(() => useArtifact())

			const testMetadata: ArtifactMetadata = { language: "typescript" }

			act(() => {
				result.current.setMetadata(testMetadata)
			})

			expect(result.current.metadata).toEqual(testMetadata)
		})

		it("should clear metadata when document changes", () => {
			mockData = createTestArtifact({ documentId: "doc-1" })

			const { result, rerender } = renderHook(() => useArtifact())

			// Set metadata
			act(() => {
				result.current.setMetadata({ language: "typescript" })
			})

			expect(result.current.metadata).toEqual({ language: "typescript" })

			// Change document
			mockData = createTestArtifact({ documentId: "doc-2" })

			rerender()

			// Metadata should be cleared
			expect(result.current.metadata).toBeNull()
		})

		it("should preserve metadata for same document", () => {
			mockData = createTestArtifact({ documentId: "doc-1" })

			const { result, rerender } = renderHook(() => useArtifact())

			// Set metadata
			act(() => {
				result.current.setMetadata({ language: "typescript" })
			})

			// Rerender without changing document
			rerender()

			// Metadata should still be there
			expect(result.current.metadata).toEqual({ language: "typescript" })
		})
	})

	// ---------------------------------------------------------------------------
	// Document ID Tracking Tests
	// ---------------------------------------------------------------------------

	describe("document ID tracking", () => {
		it("should track document ID changes", () => {
			mockData = createTestArtifact({ documentId: "doc-1" })

			const { result, rerender } = renderHook(() => useArtifact())

			expect(result.current.artifact.documentId).toBe("doc-1")

			// Change document
			mockData = createTestArtifact({ documentId: "doc-2" })

			rerender()

			expect(result.current.artifact.documentId).toBe("doc-2")
		})
	})
})

// =============================================================================
// useArtifactSelector Tests
// =============================================================================

describe("useArtifactSelector", () => {
	beforeEach(() => {
		mockData = undefined
		vi.clearAllMocks()
	})

	// ---------------------------------------------------------------------------
	// Selector Tests
	// ---------------------------------------------------------------------------

	describe("selector function", () => {
		it("should select specific property from artifact", () => {
			mockData = createTestArtifact({ isVisible: true })

			const selectIsVisible = (state: UIArtifact) => state.isVisible

			const { result } = renderHook(() =>
				useArtifactSelector(selectIsVisible),
			)

			expect(result.current).toBe(true)
		})

		it("should select title from artifact", () => {
			mockData = createTestArtifact({ title: "My Document" })

			const selectTitle = (state: UIArtifact) => state.title

			const { result } = renderHook(() =>
				useArtifactSelector(selectTitle),
			)

			expect(result.current).toBe("My Document")
		})

		it("should select kind from artifact", () => {
			mockData = createTestArtifact({ kind: "code" })

			const selectKind = (state: UIArtifact) => state.kind

			const { result } = renderHook(() => useArtifactSelector(selectKind))

			expect(result.current).toBe("code")
		})

		it("should select content from artifact", () => {
			mockData = createTestArtifact({ content: "Hello world" })

			const selectContent = (state: UIArtifact) => state.content

			const { result } = renderHook(() =>
				useArtifactSelector(selectContent),
			)

			expect(result.current).toBe("Hello world")
		})

		it("should select status from artifact", () => {
			mockData = createTestArtifact({ status: "streaming" })

			const selectStatus = (state: UIArtifact) => state.status

			const { result } = renderHook(() =>
				useArtifactSelector(selectStatus),
			)

			expect(result.current).toBe("streaming")
		})

		it("should select bounding box from artifact", () => {
			const boundingBox = { top: 10, left: 20, width: 200, height: 150 }
			mockData = createTestArtifact({ boundingBox })

			const selectBoundingBox = (state: UIArtifact) => state.boundingBox

			const { result } = renderHook(() =>
				useArtifactSelector(selectBoundingBox),
			)

			expect(result.current).toEqual(boundingBox)
		})
	})

	// ---------------------------------------------------------------------------
	// SSR/Hydration Tests
	// ---------------------------------------------------------------------------

	describe("SSR/hydration handling", () => {
		it("should return initial data before mount", () => {
			// This tests the mounted state behavior
			const selectIsVisible = (state: UIArtifact) => state.isVisible

			const { result } = renderHook(() =>
				useArtifactSelector(selectIsVisible),
			)

			// Should return initial data (false) regardless of mockData
			expect(result.current).toBe(false)
		})

		it("should use initialArtifactData when no data available", () => {
			mockData = undefined

			const selectDocumentId = (state: UIArtifact) => state.documentId

			const { result } = renderHook(() =>
				useArtifactSelector(selectDocumentId),
			)

			// Should return initial data documentId
			expect(result.current).toBe("init")
		})
	})

	// ---------------------------------------------------------------------------
	// Complex Selector Tests
	// ---------------------------------------------------------------------------

	describe("complex selectors", () => {
		it("should select derived value", () => {
			mockData = createTestArtifact({
				content: "This is a long content string",
			})

			const selectContentLength = (state: UIArtifact) =>
				state.content.length

			const { result } = renderHook(() =>
				useArtifactSelector(selectContentLength),
			)

			expect(result.current).toBe(29)
		})

		it("should select computed property", () => {
			mockData = createTestArtifact({
				status: "streaming",
				isVisible: true,
			})

			const selectIsActive = (state: UIArtifact) =>
				state.status === "streaming" && state.isVisible

			const { result } = renderHook(() =>
				useArtifactSelector(selectIsActive),
			)

			expect(result.current).toBe(true)
		})

		it("should select object subset", () => {
			mockData = createTestArtifact({
				documentId: "doc-123",
				title: "Test",
				kind: "text",
			})

			const selectSummary = (state: UIArtifact) => ({
				id: state.documentId,
				title: state.title,
			})

			const { result } = renderHook(() =>
				useArtifactSelector(selectSummary),
			)

			expect(result.current).toEqual({
				id: "doc-123",
				title: "Test",
			})
		})
	})
})

// =============================================================================
// Initial Artifact Data Tests
// =============================================================================

describe("initialArtifactData", () => {
	it("should have correct default values", () => {
		expect(initialArtifactData).toEqual({
			documentId: "init",
			content: "",
			kind: "text",
			title: "",
			status: "idle",
			isVisible: false,
			boundingBox: {
				top: 0,
				left: 0,
				width: 0,
				height: 0,
			},
		})
	})

	it("should be a valid UIArtifact", () => {
		expect(initialArtifactData.documentId).toBeTypeOf("string")
		expect(initialArtifactData.content).toBeTypeOf("string")
		expect(["text", "code", "image", "sheet"]).toContain(
			initialArtifactData.kind,
		)
		expect(initialArtifactData.title).toBeTypeOf("string")
		expect(["idle", "streaming"]).toContain(initialArtifactData.status)
		expect(typeof initialArtifactData.isVisible).toBe("boolean")
	})
})
