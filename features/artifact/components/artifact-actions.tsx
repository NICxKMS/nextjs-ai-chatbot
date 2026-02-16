/**
 * Artifact Actions Component
 *
 * Toolbar component for artifact actions like version switching,
 * saving, and type-specific actions.
 *
 * @module features/artifact/components/artifact-actions
 */
"use client"

import { memo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import type {
	ArtifactActionContext,
	ArtifactActionsProps,
	ArtifactDefinition,
	ArtifactKind,
} from "../types"

/**
 * Default artifact definitions for built-in artifact types.
 * These provide basic actions for each artifact kind.
 */
const defaultArtifactDefinitions: ArtifactDefinition[] = [
	{
		kind: "text",
		name: "Text",
		description: "Text document",
		actions: [],
		content: () => null,
	},
	{
		kind: "code",
		name: "Code",
		description: "Code artifact",
		actions: [],
		content: () => null,
	},
	{
		kind: "image",
		name: "Image",
		description: "Image artifact",
		actions: [],
		content: () => null,
	},
	{
		kind: "sheet",
		name: "Sheet",
		description: "Spreadsheet artifact",
		actions: [],
		content: () => null,
	},
]

/**
 * Get artifact definition by kind
 */
function getArtifactDefinition(
	kind: ArtifactKind,
): ArtifactDefinition | undefined {
	return defaultArtifactDefinitions.find((def) => def.kind === kind)
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

	const artifactDefinition = getArtifactDefinition(artifact.kind)

	// Gracefully handle missing artifact definition instead of crashing the React tree.
	if (!artifactDefinition) {
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

	// If no actions defined, render nothing
	if (
		!artifactDefinition.actions ||
		artifactDefinition.actions.length === 0
	) {
		return null
	}

	return (
		<div className="flex flex-row gap-1">
			{artifactDefinition.actions.map((action) => (
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
