import type { Dispatch, ReactNode, SetStateAction } from "react"

import type { UIArtifact } from "@/lib/types/artifact.types"

// ── Re-exports ──────────────────────────────────────────────
// Convenience re-exports so feature-internal files import from one location.
// Shared core types live in lib/types/ — these re-exports avoid deep imports
// within the artifacts feature.

export type {
	ArtifactKind,
	ArtifactStatus,
	ArtifactSuggestion,
	UIArtifact,
} from "@/lib/types/artifact.types"

export type {
	ArtifactHandler,
	ArtifactStreamWriter,
	CreateArtifactParams,
	UpdateArtifactParams,
} from "@/lib/types/artifact-handler.types"

// ── Initial artifact data ───────────────────────────────────
// Default state for the artifact store. Used by:
// - artifact-store.ts (initial + reset state)
// - use-artifact.ts (getServerSnapshot for SSR-safe useSyncExternalStore)

export const initialArtifactData: UIArtifact = {
	artifactId: "init",
	title: "",
	kind: "text",
	content: "",
	isVisible: false,
	status: "idle",
}

// ── Editor save callback types ───────────────────────────────
// Standardized save callback signature for all artifact editors (text,
// code, sheet). Image editor is excluded — it has no editable content.

export type EditorSaveOptions = {
	/** Whether to debounce the save. Defaults to `true`. */
	debounce?: boolean
}

export type EditorSaveCallback = (content: string, options?: EditorSaveOptions) => void

// ── Artifact action types ───────────────────────────────────
// Context provided to kind-specific artifact actions (version navigation,
// copy, undo/redo, etc.). Used by artifact-actions.tsx (P4-T12).
// Generic M allows each editor kind to carry its own metadata shape.

export type ArtifactActionContext<M = unknown> = {
	content: string
	handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void
	currentVersionIndex: number
	isCurrentVersion: boolean
	mode: "edit" | "diff"
	metadata: M
	setMetadata: Dispatch<SetStateAction<M>>
}

export type ArtifactAction<M = unknown> = {
	icon: ReactNode
	label?: string
	description: string
	onClick: (context: ArtifactActionContext<M>) => Promise<void> | void
	isDisabled?: (context: ArtifactActionContext<M>) => boolean
}

// ── Artifact toolbar types ──────────────────────────────────
// Toolbar items for AI-assisted actions (e.g., "Add comments", "Fix bugs").
// Used by artifact panel toolbar (P4-T11, P4-T12).

export type ArtifactToolbarContext = {
	sendMessage: (message: string) => void
}

export type ArtifactToolbarItem = {
	description: string
	icon: ReactNode
	onClick: (context: ArtifactToolbarContext) => void
}
