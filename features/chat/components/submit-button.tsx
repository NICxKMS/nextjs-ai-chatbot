"use client"

import { ArrowUpIcon, StopIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface SubmitButtonProps {
	isSubmitting: boolean
	hasInput: boolean
	isUploading: boolean
	onSubmit: () => void
	onStop: () => void
}

export function SubmitButton({
	isSubmitting,
	hasInput,
	isUploading,
	onSubmit,
	onStop,
}: SubmitButtonProps) {
	if (isSubmitting) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label="Stop generation"
						className="relative size-8 shrink-0 rounded-full after:absolute after:-inset-1.5 after:md:hidden"
						data-testid="stop-button"
						onClick={(e) => {
							e.preventDefault()
							onStop()
						}}
						size="icon"
						variant="destructive"
					>
						<StopIcon size={14} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Stop generation</TooltipContent>
			</Tooltip>
		)
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					aria-label="Send message"
					className="relative size-8 shrink-0 rounded-full after:absolute after:-inset-1.5 after:md:hidden"
					data-testid="send-button"
					disabled={!hasInput || isUploading}
					onClick={(e) => {
						e.preventDefault()
						onSubmit()
					}}
					size="icon"
					variant="default"
				>
					<ArrowUpIcon size={14} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>Send message</TooltipContent>
		</Tooltip>
	)
}
