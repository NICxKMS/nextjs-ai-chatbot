/**
 * Artifact Context Hook
 *
 * Provides access to artifact state via SWR for client-side state management.
 *
 * @module features/artifact/hooks/use-artifact
 */
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import type { ArtifactMetadata, UIArtifact } from "../types"
import { initialArtifactData } from "../types"

type Selector<T> = (state: UIArtifact) => T

/**
 * Selector hook for reading specific artifact state.
 * IMPORTANT: Pass a stable/memoized selector function to avoid unnecessary recalculations.
 * @example
 * // Good - stable selector
 * const isVisible = useArtifactSelector(useCallback((state) => state.isVisible, []));
 * // Or define selector outside component
 * const selectIsVisible = (state: UIArtifact) => state.isVisible;
 * const isVisible = useArtifactSelector(selectIsVisible);
 */
export function useArtifactSelector<Selected>(selector: Selector<Selected>) {
	const [mounted, setMounted] = useState(false)
	const { data: localArtifact } = useSWR<UIArtifact>("artifact", null, {
		fallbackData: initialArtifactData,
	})

	useEffect(() => {
		setMounted(true)
	}, [])

	const selectedValue = useMemo(() => {
		// Return initial data during SSR/before mount to prevent hydration mismatch
		if (!mounted) {
			return selector(initialArtifactData)
		}
		if (!localArtifact) {
			return selector(initialArtifactData)
		}
		return selector(localArtifact)
	}, [localArtifact, selector, mounted])

	return selectedValue
}

/**
 * Hook for accessing and modifying artifact state.
 * Uses SWR for client-side state persistence and reactivity.
 */
export function useArtifact() {
	const { data: localArtifact, mutate: setLocalArtifact } =
		useSWR<UIArtifact>("artifact", null, {
			fallbackData: initialArtifactData,
		})

	const artifact = useMemo(() => {
		if (!localArtifact) {
			return initialArtifactData
		}
		return localArtifact
	}, [localArtifact])

	const setArtifact = useCallback(
		(
			updaterFn:
				| UIArtifact
				| ((currentArtifact: UIArtifact) => UIArtifact),
		) => {
			setLocalArtifact((currentArtifact) => {
				const artifactToUpdate = currentArtifact || initialArtifactData

				if (typeof updaterFn === "function") {
					return updaterFn({ ...artifactToUpdate })
				}

				return updaterFn
			})
		},
		[setLocalArtifact],
	)

	// Track previous documentId to detect changes and clear stale metadata
	const previousDocumentIdRef = useRef(artifact.documentId)

	const [metadata, setMetadata] = useState<ArtifactMetadata>(null)

	// Clear metadata when document changes
	useEffect(() => {
		if (artifact.documentId !== previousDocumentIdRef.current) {
			setMetadata(null)
			previousDocumentIdRef.current = artifact.documentId
		}
	}, [artifact.documentId])

	return {
		artifact,
		setArtifact,
		metadata,
		setMetadata,
	}
}

export { initialArtifactData }
