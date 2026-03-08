import { initialArtifactData } from "@/features/artifacts/types/artifact.types"
import type { ArtifactKind, UIArtifact } from "@/lib/types/artifact.types"

// ── Module-level artifact store ─────────────────────────────
// Singleton state for the artifact panel. Uses useSyncExternalStore
// pattern — no provider, no SWR, no context overhead.
//
// Consumers:
// - useArtifact() / useArtifactSelector() hooks (P4-T03)
// - useChatSession.onData writes via setState + batchUpdate
// - ArtifactPanel, ArtifactCloseButton, etc. subscribe via hooks

// ── Kind validation ─────────────────────────────────────────
// Runtime guard against invalid kind values flowing through the store.
// TypeScript types are erased at runtime, so this adds defense-in-depth
// for data arriving from the server stream or external sources.

const VALID_ARTIFACT_KINDS: ReadonlySet<string> = new Set<ArtifactKind>([
	"text",
	"code",
	"image",
	"sheet",
])

function validateKind(kind: string): ArtifactKind {
	if (VALID_ARTIFACT_KINDS.has(kind)) return kind as ArtifactKind
	return "text"
}

let state: UIArtifact = initialArtifactData
const listeners = new Set<() => void>()
let isBatching = false

function emitChange(): void {
	if (isBatching) return
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
		// Validate kind at the store boundary — defense-in-depth against
		// unvalidated strings flowing from stream deltas or external sources.
		if (next.kind !== state.kind) {
			state = { ...next, kind: validateKind(next.kind) }
		} else {
			state = next
		}
		emitChange()
	},

	/** Resets artifact state to initial defaults. */
	reset(): void {
		state = initialArtifactData
		emitChange()
	},

	/**
	 * Executes `fn` while deferring subscriber notifications.
	 * All `setState` / `reset` calls inside `fn` are applied immediately,
	 * but `emitChange` fires only once — after `fn` returns.
	 * This ensures N store mutations produce only 1 subscriber notification.
	 */
	batchUpdate(fn: () => void): void {
		isBatching = true
		try {
			fn()
		} finally {
			isBatching = false
			emitChange()
		}
	},
} as const
