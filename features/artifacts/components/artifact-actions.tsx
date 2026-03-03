"use client"

import { type Dispatch, memo, type SetStateAction, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils/cn"
import { useArtifactSelector } from "../hooks/use-artifact-selector"
import type { ArtifactAction, ArtifactActionContext } from "../types/artifact.types"

// ── Types ────────────────────────────────────────────────────

type ArtifactActionsProps = {
	actions: ArtifactAction[]
	handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void
	currentVersionIndex: number
	isCurrentVersion: boolean
	mode: "edit" | "diff"
	metadata: unknown
	setMetadata: Dispatch<SetStateAction<unknown>>
}

// ── Component ────────────────────────────────────────────────

function PureArtifactActions({
	actions,
	handleVersionChange,
	currentVersionIndex,
	isCurrentVersion,
	mode,
	metadata,
	setMetadata,
}: ArtifactActionsProps) {
	const [isLoading, setIsLoading] = useState(false)
	const status = useArtifactSelector((s) => s.status)
	const content = useArtifactSelector((s) => s.content)

	if (actions.length === 0) {
		return null
	}

	const actionContext: ArtifactActionContext = {
		content,
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
								isLoading || status === "streaming"
									? true
									: action.isDisabled
										? action.isDisabled(actionContext)
										: false
							}
							onClick={async () => {
								setIsLoading(true)
								try {
									await Promise.resolve(action.onClick(actionContext))
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

export const ArtifactActions = memo(PureArtifactActions, (prevProps, nextProps) => {
	if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) return false
	if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false
	if (prevProps.mode !== nextProps.mode) return false
	if (prevProps.metadata !== nextProps.metadata) return false
	if (prevProps.setMetadata !== nextProps.setMetadata) return false
	if (prevProps.handleVersionChange !== nextProps.handleVersionChange) return false
	if (prevProps.actions !== nextProps.actions) return false
	return true
})
