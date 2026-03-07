import { formatDistance } from "date-fns"
import type { Dispatch, SetStateAction } from "react"

import { LoaderIcon } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import type { Artifact } from "@/lib/types/models.types"

import type { ArtifactAction, ArtifactKind, ArtifactStatus } from "../types/artifact.types"
import { ArtifactActions } from "./artifact-actions"
import { ArtifactCloseButton } from "./artifact-close-button"
import { DEFAULT_SAVE_ERROR_MESSAGE, type SaveState } from "./artifact-save-utils"

// ── Status subtitle ──────────────────────────────────────────

interface ArtifactPanelStatusProps {
	artifactStatus: ArtifactStatus
	saveState: SaveState
	saveErrorMessage: string | null
	isContentDirty: boolean
	currentVersion: Artifact | null
	onRetrySave: () => void
}

function ArtifactPanelStatus({
	artifactStatus,
	saveState,
	saveErrorMessage,
	isContentDirty,
	currentVersion,
	onRetrySave,
}: ArtifactPanelStatusProps) {
	if (artifactStatus === "streaming") {
		return (
			<div className="flex items-center gap-1.5 text-muted-foreground text-sm">
				<div className="animate-spin">
					<LoaderIcon size={12} />
				</div>
				Generating…
			</div>
		)
	}

	if (saveState === "pending") {
		return <div className="text-muted-foreground text-sm">Saving changes…</div>
	}

	if (saveState === "error") {
		return (
			<div className="flex items-center gap-2 text-sm">
				<div className="text-destructive">
					{saveErrorMessage ?? DEFAULT_SAVE_ERROR_MESSAGE}
				</div>
				<button
					className="cursor-pointer font-medium text-foreground underline underline-offset-4"
					onClick={onRetrySave}
					type="button"
				>
					Retry save
				</button>
			</div>
		)
	}

	if (isContentDirty) {
		return <div className="text-muted-foreground text-sm">Unsaved changes</div>
	}

	if (currentVersion) {
		return (
			<div className="text-muted-foreground text-sm">
				{`Updated ${formatDistance(new Date(currentVersion.createdAt), new Date(), { addSuffix: true })}`}
			</div>
		)
	}

	return <div className="mt-1 h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
}

// ── Header ───────────────────────────────────────────────────

interface ArtifactPanelHeaderProps {
	artifactTitle: string
	artifactKind: ArtifactKind
	artifactStatus: ArtifactStatus
	saveState: SaveState
	saveErrorMessage: string | null
	isContentDirty: boolean
	currentVersion: Artifact | null
	onRetrySave: () => void
	actions: ArtifactAction[]
	currentVersionIndex: number
	handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void
	isCurrentVersion: boolean
	metadata: unknown
	setMetadata: Dispatch<SetStateAction<unknown>>
}

export function ArtifactPanelHeader({
	artifactTitle,
	artifactKind,
	artifactStatus,
	saveState,
	saveErrorMessage,
	isContentDirty,
	currentVersion,
	onRetrySave,
	actions,
	currentVersionIndex,
	handleVersionChange,
	isCurrentVersion,
	metadata,
	setMetadata,
}: ArtifactPanelHeaderProps) {
	return (
		<div className="flex flex-row items-start justify-between border-b p-2">
			<div className="flex flex-row items-start gap-4">
				<ArtifactCloseButton />
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-2">
						<span className="font-medium">{artifactTitle}</span>
						<Badge variant="secondary" className="text-xs capitalize">
							{artifactKind}
						</Badge>
					</div>
					<ArtifactPanelStatus
						artifactStatus={artifactStatus}
						saveState={saveState}
						saveErrorMessage={saveErrorMessage}
						isContentDirty={isContentDirty}
						currentVersion={currentVersion}
						onRetrySave={onRetrySave}
					/>
				</div>
			</div>

			<ArtifactActions
				actions={actions}
				currentVersionIndex={currentVersionIndex}
				handleVersionChange={handleVersionChange}
				isCurrentVersion={isCurrentVersion}
				metadata={metadata}
				mode="edit"
				setMetadata={setMetadata}
			/>
		</div>
	)
}
