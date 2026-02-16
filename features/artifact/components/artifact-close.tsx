/**
 * Artifact Close Button
 *
 * Close button component for the artifact panel.
 * Handles closing the artifact panel and resetting state.
 *
 * @module features/artifact/components/artifact-close
 */
"use client"

import { X } from "lucide-react"
import { memo } from "react"

import { Button } from "@/components/ui/button"

import { initialArtifactData, useArtifact } from "../hooks"
import type { ArtifactCloseProps } from "../types"

function PureArtifactCloseButton({ onClose }: ArtifactCloseProps) {
	const { setArtifact } = useArtifact()

	const handleClose = () => {
		if (onClose) {
			onClose()
		} else {
			setArtifact((currentArtifact) =>
				currentArtifact.status === "streaming"
					? {
							...currentArtifact,
							isVisible: false,
						}
					: { ...initialArtifactData, status: "idle" },
			)
		}
	}

	return (
		<Button
			className="h-fit p-2 dark:hover:bg-zinc-700"
			data-testid="artifact-close-button"
			onClick={handleClose}
			variant="outline"
		>
			<X size={18} />
		</Button>
	)
}

export const ArtifactClose = memo(PureArtifactCloseButton, () => true)
