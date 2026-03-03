"use client"

import { memo } from "react"

import { CrossIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { useArtifact } from "../hooks/use-artifact"

// ── Component ────────────────────────────────────────────────
// Pure visibility toggle — sets isVisible: false on close.
// Reset of full artifact state is handled by chat lifecycle events
// (per state-management/streaming specs), not by this component.

function PureArtifactCloseButton() {
	const { setArtifact } = useArtifact()

	return (
		<Button
			className="h-fit p-2 dark:hover:bg-zinc-700"
			data-testid="artifact-close-button"
			onClick={() => {
				setArtifact((currentArtifact) => ({
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

// Always skip re-render — button appearance never changes.
// It reads from the store imperatively via setArtifact updater function.
export const ArtifactCloseButton = memo(PureArtifactCloseButton, () => true)
