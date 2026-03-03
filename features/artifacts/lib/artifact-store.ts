import { initialArtifactData } from "@/features/artifacts/types/artifact.types"
import type { UIArtifact } from "@/lib/types/artifact.types"

// ── Module-level artifact store ─────────────────────────────
// Singleton state for the artifact panel. Uses useSyncExternalStore
// pattern — no provider, no SWR, no context overhead.
//
// Consumers:
// - useArtifact() / useArtifactSelector() hooks (P4-T03)
// - StreamBridge (P3-T20) calls setState/appendContent/replaceContent
// - ArtifactPanel, ArtifactCloseButton, etc. subscribe via hooks

let state: UIArtifact = initialArtifactData
const listeners = new Set<() => void>()

function emitChange(): void {
	for (const listener of listeners) {
		listener()
	}
}

// ── Store API ───────────────────────────────────────────────

export const artifactStore = {
	/** Returns current artifact state snapshot. */
	getSnapshot(): UIArtifact {
		return state
	},

	/** SSR-safe fallback — returns initial (empty) artifact data. */
	getServerSnapshot(): UIArtifact {
		return initialArtifactData
	},

	/**
	 * Registers a listener notified on state change.
	 * Returns an unsubscribe function.
	 */
	subscribe(listener: () => void): () => void {
		listeners.add(listener)
		return () => {
			listeners.delete(listener)
		}
	},

	/**
	 * Updates artifact state via an updater function.
	 * Skips emit if the updater returns the same reference (no-op).
	 */
	setState(updater: (prev: UIArtifact) => UIArtifact): void {
		const next = updater(state)
		if (next === state) return
		state = next
		emitChange()
	},

	/** Resets artifact state to initial defaults. */
	reset(): void {
		state = initialArtifactData
		emitChange()
	},

	// ── Content accumulation helpers ──────────────────────────
	// These encode the delta semantics so callers (StreamBridge) don't
	// need to know kind-specific accumulation logic.

	/**
	 * Appends a text delta to the current content.
	 * Used for `artifact-textDelta` stream parts (text kind).
	 */
	appendContent(delta: string): void {
		state = { ...state, content: state.content + delta }
		emitChange()
	},

	/**
	 * Replaces the entire content with the given value.
	 * Used for `artifact-codeDelta`, `artifact-sheetDelta`, and
	 * `artifact-imageDelta` stream parts (code/sheet/image kinds).
	 */
	replaceContent(content: string): void {
		state = { ...state, content }
		emitChange()
	},
} as const
