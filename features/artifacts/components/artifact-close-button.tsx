"use client"

import { memo } from "react"

import { CrossIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { artifactStore } from "../lib/artifact-store"

// ── Component ────────────────────────────────────────────────
// Pure visibility toggle — sets isVisible: false on close.
// Reset of full artifact state is handled by chat lifecycle events
// (per state-management/streaming specs), not by this component.
//
// Uses artifactStore.setState directly instead of useArtifact() to
// avoid subscribing to the store — this component only writes (never
// reads), so a useSyncExternalStore subscription would cause
// unnecessary re-renders on every artifact state change.

function PureArtifactCloseButton() {
	return (
		<Button
			className="relative h-fit p-2 after:absolute after:-inset-1.5 after:md:hidden dark:hover:bg-zinc-700"
			data-testid="artifact-close-button"
			onClick={() => {
				artifactStore.setState((currentArtifact) => ({
					...currentArtifact,
					isVisible: false,
				}))
			}}
			variant="outline"
		>
			<CrossIcon size={18} />
		</Button>
	)
}

// No props and no store subscription — memo prevents parent re-renders.
export const ArtifactCloseButton = memo(PureArtifactCloseButton)
