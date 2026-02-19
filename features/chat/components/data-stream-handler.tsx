/**
 * Data Stream Handler Component
 *
 * Processes artifact streaming data from AI responses.
 * Handles data-id, data-title, data-kind, data-clear, data-finish stream parts
 * to update artifact state in real-time during generation.
 *
 * @module features/chat/components/data-stream-handler
 */

"use client"

import type { DataUIPart } from "ai"
import { useEffect, useRef } from "react"
import {
	initialArtifactData,
	useArtifact,
} from "@/features/artifact/hooks/use-artifact"
import type { ArtifactKind } from "@/features/artifact/types"
import { useDataStream } from "../hooks/use-data-stream"
import type { CustomUIDataTypes } from "../types"

// =============================================================================
// Types
// =============================================================================

/**
 * Stream part handler context for artifact-specific processing
 */
export interface StreamPartHandlerContext {
	/** The stream part being processed */
	streamPart: DataUIPart<CustomUIDataTypes>
	/** Update artifact state */
	setArtifact: ReturnType<typeof useArtifact>["setArtifact"]
	/** Update artifact metadata */
	setMetadata: ReturnType<typeof useArtifact>["setMetadata"]
}

/**
 * Artifact definition for stream processing
 * Each artifact type can define how to handle specific stream parts
 */
export interface ArtifactStreamDefinition {
	/** Artifact kind this definition applies to */
	kind: ArtifactKind
	/** Handler for stream parts specific to this artifact type */
	onStreamPart?: (context: StreamPartHandlerContext) => void
}

// =============================================================================
// Artifact Stream Definitions
// =============================================================================

/**
 * Default artifact stream definitions
 * These handle artifact-specific delta types (text, code, image, sheet)
 *
 * Each handler:
 * 1. Updates content with explicit streaming status
 * 2. Handles type-specific metadata (e.g., text suggestions)
 * 3. Implements auto-show behavior for text artifacts
 */
export const artifactStreamDefinitions: ArtifactStreamDefinition[] = [
	{
		kind: "text",
		onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
			// Handle suggestion metadata - accumulate into array
			// Uses callback form to properly merge multiple suggestions
			if (streamPart.type === "data-suggestion") {
				setMetadata(
					(prevMetadata: { suggestions: unknown[] } | null) => ({
						suggestions: [
							...(prevMetadata?.suggestions ?? []),
							streamPart.data,
						],
					}),
				)
			}

			// Handle text content delta with visibility toggle and status
			if (streamPart.type === "data-textDelta") {
				setArtifact((draft) => {
					const newContent = draft.content + streamPart.data
					return {
						...draft,
						content: newContent,
						// Auto-show artifact panel when content reaches 400-450 chars
						// This provides a smooth reveal experience during streaming
						isVisible:
							draft.status === "streaming" &&
							newContent.length > 400 &&
							newContent.length < 450
								? true
								: draft.isVisible,
						status: "streaming",
					}
				})
			}
		},
	},
	{
		kind: "code",
		onStreamPart: ({ streamPart, setArtifact }) => {
			if (streamPart.type === "data-codeDelta") {
				setArtifact((draft) => ({
					...draft,
					content: draft.content + streamPart.data,
					status: "streaming",
				}))
			}
		},
	},
	{
		kind: "image",
		onStreamPart: ({ streamPart, setArtifact }) => {
			if (streamPart.type === "data-imageDelta") {
				setArtifact((draft) => ({
					...draft,
					content: draft.content + streamPart.data,
					status: "streaming",
				}))
			}
		},
	},
	{
		kind: "sheet",
		onStreamPart: ({ streamPart, setArtifact }) => {
			if (streamPart.type === "data-sheetDelta") {
				setArtifact((draft) => ({
					...draft,
					content: draft.content + streamPart.data,
					status: "streaming",
				}))
			}
		},
	},
]

// =============================================================================
// Component
// =============================================================================

/**
 * Props for DataStreamHandler component
 */
export interface DataStreamHandlerProps {
	/** Optional callback when artifact data is received */
	onArtifactUpdate?: (update: ArtifactStreamUpdate) => void
	/** Optional callback when artifact streaming completes */
	onArtifactComplete?: () => void
	/** Optional callback when artifact is cleared */
	onArtifactClear?: () => void
}

/**
 * Artifact stream update data
 */
export interface ArtifactStreamUpdate {
	/** Artifact ID being streamed */
	id?: string
	/** Artifact title */
	title?: string
	/** Artifact kind (text, code, sheet, image) */
	kind?: ArtifactKind
	/** Content delta */
	content?: string
	/** Whether streaming is complete */
	isComplete?: boolean
}

/**
 * DataStreamHandler Component
 *
 * Processes artifact streaming data from AI responses.
 * Renders nothing (returns null) - side-effect only component.
 *
 * @example
 * ```tsx
 * <DataStreamProvider>
 *   <DataStreamHandler />
 *   <Chat />
 * </DataStreamProvider>
 * ```
 */
export function DataStreamHandler({
	onArtifactUpdate,
	onArtifactComplete,
	onArtifactClear,
}: DataStreamHandlerProps): null {
	const { dataStream } = useDataStream()
	const { artifact, setArtifact, setMetadata } = useArtifact()

	const lastProcessedIndex = useRef(-1)
	const lastArtifactKind = useRef(artifact.kind)

	// Extract artifact.kind to use as a stable dependency
	const artifactKind = artifact.kind

	// Reset processed index when stream is cleared or artifact kind changes
	useEffect(() => {
		// Reset if artifact kind changed
		if (lastArtifactKind.current !== artifactKind) {
			lastProcessedIndex.current = -1
			lastArtifactKind.current = artifactKind
		}

		if (!dataStream?.length) {
			lastProcessedIndex.current = -1
			return
		}

		const newDeltas = dataStream.slice(lastProcessedIndex.current + 1)
		lastProcessedIndex.current = dataStream.length - 1

		for (const delta of newDeltas) {
			const artifactDefinition = artifactStreamDefinitions.find(
				(definition) => definition.kind === artifactKind,
			)

			// Consolidate updates into a single setArtifact call per delta
			// to prevent double state updates and potential race conditions
			setArtifact((draftArtifact) => {
				const currentArtifact = draftArtifact || {
					...initialArtifactData,
					status: "streaming" as const,
				}

				// First apply base delta updates
				let updatedArtifact: typeof currentArtifact
				switch (delta.type) {
					case "data-id":
						updatedArtifact = {
							...currentArtifact,
							documentId: String(delta.data),
							status: "streaming",
						}
						onArtifactUpdate?.({ id: String(delta.data) })
						break

					case "data-title":
						updatedArtifact = {
							...currentArtifact,
							title: String(delta.data),
							status: "streaming",
						}
						onArtifactUpdate?.({ title: String(delta.data) })
						break

					case "data-kind":
						updatedArtifact = {
							...currentArtifact,
							kind: delta.data as ArtifactKind,
							status: "streaming",
						}
						onArtifactUpdate?.({ kind: delta.data as ArtifactKind })
						break

					case "data-clear":
						updatedArtifact = {
							...currentArtifact,
							content: "",
							status: "streaming",
						}
						onArtifactClear?.()
						break

					case "data-finish":
						updatedArtifact = {
							...currentArtifact,
							status: "idle",
						}
						onArtifactComplete?.()
						break

					case "data-error":
						updatedArtifact = {
							...currentArtifact,
							status: "idle",
						}
						onArtifactUpdate?.({
							isComplete: false,
						})
						break

					case "data-tool-call":
						updatedArtifact = currentArtifact
						onArtifactUpdate?.({})
						break

					case "data-tool-result":
						updatedArtifact = currentArtifact
						onArtifactUpdate?.({})
						break

					default:
						updatedArtifact = currentArtifact
				}

				return updatedArtifact
			})

			// Handle artifact-specific stream part processing (for content deltas and metadata updates)
			// This is called after the base artifact update to ensure consistent state
			if (artifactDefinition?.onStreamPart) {
				artifactDefinition.onStreamPart({
					streamPart: delta,
					setArtifact,
					setMetadata,
				})
			}
		}
	}, [
		dataStream,
		setArtifact,
		setMetadata,
		artifactKind,
		onArtifactUpdate,
		onArtifactComplete,
		onArtifactClear,
	])

	return null
}
