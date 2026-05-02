"use client"

import { useCallback, useRef, useSyncExternalStore } from "react"
import { artifactStore } from "@/features/artifacts/lib/artifact-store"
import { initialArtifactData } from "@/features/artifacts/types/artifact.types"
import type { UIArtifact } from "@/lib/types/artifact.types"

// ── useArtifactSelector ─────────────────────────────────────
// Subscribes to a derived slice of the artifact state. Only triggers
// a re-render when the selected value changes (shallow equality).
//
// Example: useArtifactSelector(s => s.isVisible) — only re-renders
// when `isVisible` flips, ignoring content/title/status changes.

/**
 * Subscribes to a derived slice of the artifact store.
 * Only re-renders when the selected value changes (referential equality).
 *
 * @param selector - Pure function that extracts a value from UIArtifact.
 */
export function useArtifactSelector<T>(selector: (artifact: UIArtifact) => T): T {
	const selectorRef = useRef(selector)
	selectorRef.current = selector

	// Cache both the store snapshot and the derived selection.
	// The snapshot cache ensures repeated getSnapshot calls between store
	// updates return the same value — required by useSyncExternalStore's contract.
	const prevSnapshotRef = useRef<UIArtifact | undefined>(undefined)
	const prevSelectionRef = useRef<T | undefined>(undefined)

	const getSnapshot = useCallback((): T => {
		const nextSnapshot = artifactStore.getSnapshot()

		// Same store snapshot → return cached selection (satisfies contract)
		if (Object.is(prevSnapshotRef.current, nextSnapshot)) {
			return prevSelectionRef.current as T
		}

		const nextSelection = selectorRef.current(nextSnapshot)
		prevSnapshotRef.current = nextSnapshot

		// Selected value unchanged → keep old reference to prevent re-render
		if (Object.is(prevSelectionRef.current, nextSelection)) {
			return prevSelectionRef.current as T
		}

		prevSelectionRef.current = nextSelection
		return nextSelection
	}, [])

	const getServerSnapshot = useCallback((): T => {
		return selectorRef.current(initialArtifactData)
	}, [])

	return useSyncExternalStore(artifactStore.subscribe, getSnapshot, getServerSnapshot)
}
