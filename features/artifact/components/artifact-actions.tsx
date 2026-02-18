/**
 * Artifact Actions Component
 *
 * Toolbar component for artifact actions like version switching,
 * saving, and type-specific actions.
 *
 * Uses the artifact registry for type-specific actions and provides
 * default actions (copy, version navigation) for all artifact types.
 *
 * @module features/artifact/components/artifact-actions
 */
"use client"

import { memo, useState } from "react"
import { toast } from "sonner"

import { CopyIcon, EyeIcon, RedoIcon, UndoIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { getArtifactDefinition } from "../lib"
import type {
	ArtifactAction,
	ArtifactActionContext,
	ArtifactActionsProps,
	ArtifactKind,
} from "../types"

/**
 * Default actions available for all artifact types
 * These provide version navigation and copy functionality
 */
function createDefaultActions(): ArtifactAction[] {
	return [
		{
			description: "View changes",
			icon: <EyeIcon size={18} />,
			onClick: ({ handleVersionChange }: ArtifactActionContext) => {
				handleVersionChange("toggle")
			},
			isDisabled: ({ currentVersionIndex }: ArtifactActionContext) => {
				return currentVersionIndex === 0
			},
		},
		{
			description: "View Previous version",
			icon: <UndoIcon size={18} />,
			onClick: ({ handleVersionChange }: ArtifactActionContext) => {
				handleVersionChange("prev")
			},
			isDisabled: ({ currentVersionIndex }: ArtifactActionContext) => {
				return currentVersionIndex === 0
			},
		},
		{
			description: "View Next version",
			icon: <RedoIcon size={18} />,
			onClick: ({ handleVersionChange }: ArtifactActionContext) => {
				handleVersionChange("next")
			},
			isDisabled: ({ isCurrentVersion }: ArtifactActionContext) => {
				return isCurrentVersion
			},
		},
		{
			description: "Copy to clipboard",
			icon: <CopyIcon size={18} />,
			onClick: ({ content }: ArtifactActionContext) => {
				navigator.clipboard.writeText(content)
				toast.success("Copied to clipboard!")
			},
		},
	]
}

/**
 * Get all actions for an artifact kind, combining:
 * 1. Type-specific actions from the registry
 * 2. Default actions (version navigation, copy)
 */
function getActionsForKind(kind: ArtifactKind): ArtifactAction[] {
	const definition = getArtifactDefinition(kind)
	const registeredActions = definition?.actions ?? []

	// If registered actions exist, use them; otherwise use defaults
	return registeredActions.length > 0
		? registeredActions
		: createDefaultActions()
}

function PureArtifactActions({
	artifact,
	handleVersionChange,
	currentVersionIndex,
	isCurrentVersion,
	mode,
	metadata,
	setMetadata,
}: ArtifactActionsProps) {
	const [isLoading, setIsLoading] = useState(false)

	const actions = getActionsForKind(artifact.kind)

	// If no actions available, render nothing
	if (actions.length === 0) {
		return null
	}

	const actionContext: ArtifactActionContext = {
		content: artifact.content,
		handleVersionChange,
		currentVersionIndex,
		isCurrentVersion,
		mode,
		metadata,
		setMetadata,
	}

	return (
		<div className="flex flex-row gap-1">
			{actions.map((action) => (
				<Tooltip key={action.description}>
					<TooltipTrigger asChild>
						<Button
							className={cn("h-fit dark:hover:bg-zinc-700", {
								"p-2": !action.label,
								"px-2 py-1.5": action.label,
							})}
							disabled={
								isLoading || artifact.status === "streaming"
									? true
									: action.isDisabled
										? action.isDisabled(actionContext)
										: false
							}
							onClick={async () => {
								setIsLoading(true)

								try {
									await Promise.resolve(
										action.onClick(actionContext),
									)
								} catch (_error) {
									toast.error("Failed to execute action")
								} finally {
									setIsLoading(false)
								}
							}}
							variant="outline"
						>
							{action.icon}
							{action.label}
						</Button>
					</TooltipTrigger>
					<TooltipContent>{action.description}</TooltipContent>
				</Tooltip>
			))}
		</div>
	)
}

export const ArtifactActions = memo(
	PureArtifactActions,
	(prevProps, nextProps) => {
		if (prevProps.artifact.status !== nextProps.artifact.status) {
			return false
		}
		if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) {
			return false
		}
		if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) {
			return false
		}
		if (prevProps.artifact.content !== nextProps.artifact.content) {
			return false
		}
		if (prevProps.mode !== nextProps.mode) {
			return false
		}
		if (prevProps.metadata !== nextProps.metadata) {
			return false
		}
		if (prevProps.setMetadata !== nextProps.setMetadata) {
			return false
		}
		if (prevProps.handleVersionChange !== nextProps.handleVersionChange) {
			return false
		}

		return true
	},
)
