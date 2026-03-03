"use client"

import { useSyncExternalStore } from "react"
import { artifactStore } from "@/features/artifacts/lib/artifact-store"
import type { UIArtifact } from "@/lib/types/artifact.types"

// ── useArtifact ─────────────────────────────────────────────
// Thin wrapper around useSyncExternalStore for the artifact store.
// Returns the full UIArtifact state + stable write methods.
//
// Consumers: ArtifactPanel (P4-T11), ArtifactActions (P4-T12),
//            ArtifactPreview (P4-T14), StreamBridge integration (P4-T17).

type UseArtifactReturn = {
	artifact: UIArtifact
	setArtifact: (updater: (prev: UIArtifact) => UIArtifact) => void
	resetArtifact: () => void
}

// Stable actions object — never changes, so extracting it outside the hook
// prevents unnecessary object allocations on each render.
const stableActions = {
	setArtifact: artifactStore.setState,
	resetArtifact: artifactStore.reset,
} as const

/**
 * Returns the current artifact state and stable write methods.
 * Re-renders whenever the artifact state changes.
 */
export function useArtifact(): UseArtifactReturn {
	const artifact = useSyncExternalStore(
		artifactStore.subscribe,
		artifactStore.getSnapshot,
		artifactStore.getServerSnapshot,
	)

	return {
		artifact,
		setArtifact: stableActions.setArtifact,
		resetArtifact: stableActions.resetArtifact,
	}
}
