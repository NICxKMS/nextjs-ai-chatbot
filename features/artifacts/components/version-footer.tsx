"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { toast } from "sonner"

import { LoaderIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import type { Artifact } from "@/lib/types/models.types"

import { useArtifactSelector } from "../hooks/use-artifact-selector"

// ── Types ────────────────────────────────────────────────────

type VersionFooterProps = {
	handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void
	versions: Artifact[] | undefined
	currentVersionIndex: number
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Gets the ISO timestamp for a given version index.
 * Returns empty string if versions array or index is invalid.
 */
function getVersionTimestamp(versions: Artifact[], index: number): string {
	const doc = versions[index]
	if (!doc) return ""
	return new Date(doc.createdAt).toISOString()
}

// ── Component ────────────────────────────────────────────────

export function VersionFooter({
	handleVersionChange,
	versions,
	currentVersionIndex,
}: VersionFooterProps) {
	const artifactId = useArtifactSelector((s) => s.artifactId)
	const [isMutating, setIsMutating] = useState(false)

	if (!versions || versions.length === 0) {
		return null
	}

	const isCurrentVersion = currentVersionIndex === versions.length - 1

	if (isCurrentVersion) {
		return null
	}

	return (
		<motion.div
			animate={{ y: 0 }}
			className="absolute bottom-0 z-50 flex w-full flex-col justify-between gap-4 border-t bg-background p-4 lg:flex-row"
			exit={{ y: 77 }}
			initial={{ y: 77 }}
			transition={{ type: "spring", stiffness: 140, damping: 20 }}
		>
			<div>
				<div className="font-medium">
					Version {currentVersionIndex + 1} of {versions.length}
				</div>
				<div className="text-muted-foreground text-sm">
					Restore this version to make edits
				</div>
			</div>

			<div className="flex flex-row gap-4">
				<Button
					disabled={currentVersionIndex <= 0}
					onClick={() => handleVersionChange("prev")}
					size="sm"
					variant="outline"
				>
					Previous
				</Button>
				<Button
					disabled={isCurrentVersion}
					onClick={() => handleVersionChange("next")}
					size="sm"
					variant="outline"
				>
					Next
				</Button>
				<Button
					disabled={isMutating}
					onClick={async () => {
						setIsMutating(true)
						try {
							const timestamp = getVersionTimestamp(versions, currentVersionIndex)
							if (!timestamp) return

							const response = await fetch("/api/artifact", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									id: artifactId,
									timestamp,
									mode: "restore",
								}),
							})

							if (!response.ok) {
								throw new Error("Restore failed")
							}

							// After restore, go to latest version (which is now the restored one)
							handleVersionChange("latest")
						} catch (error) {
							console.error("Failed to restore artifact version:", error)
							toast.error("Failed to restore version. Please try again.")
						} finally {
							setIsMutating(false)
						}
					}}
				>
					Restore this version
					{isMutating && (
						<div className="animate-spin">
							<LoaderIcon />
						</div>
					)}
				</Button>
				<Button onClick={() => handleVersionChange("latest")} variant="outline">
					Back to latest version
				</Button>
			</div>
		</motion.div>
	)
}
