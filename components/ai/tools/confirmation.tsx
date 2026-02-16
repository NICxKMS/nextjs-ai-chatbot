/**
 * AI Tool Confirmation Wrapper Component
 *
 * Project wrapper for ai-elements Confirmation primitive that adds:
 * - Tool approval dialogs
 * - Confirmation flows
 * - Action buttons
 *
 * @module components/ai/tools/confirmation
 */

"use client"

import type { ReactNode } from "react"
import {
	Confirmation as AIConfirmationBase,
	type ConfirmationProps as AIConfirmationProps,
	ConfirmationAccepted,
	ConfirmationAction,
	ConfirmationActions,
	ConfirmationRejected,
	ConfirmationRequest,
	ConfirmationTitle,
} from "@/components/ai-elements/confirmation"
import { Button } from "@/components/ui/button"
import type { ExtendedToolState } from "@/lib/types/ai-sdk"
import { cn } from "@/lib/utils"

/**
 * Props for the AIConfirmation wrapper component
 */
export interface AIConfirmationWrapperProps
	extends Omit<AIConfirmationProps, "children" | "content"> {
	/** Title for the confirmation dialog */
	title?: string
	/** Description of the action being confirmed */
	description?: string
	/** Custom content to display */
	content?: ReactNode
	/** Label for the confirm button */
	confirmLabel?: string
	/** Label for the cancel button */
	cancelLabel?: string
	/** Handler when confirmed */
	onConfirm?: () => void | Promise<void>
	/** Handler when denied */
	onDeny?: () => void
	/** Whether the confirmation is loading */
	isLoading?: boolean
	/** Whether the confirm action is destructive */
	isDestructive?: boolean
	/** Additional class names */
	className?: string
}

/**
 * AI Confirmation wrapper component
 *
 * Displays confirmation dialogs for tool actions with:
 * - Customizable title and description
 * - Confirm/Deny buttons
 * - Loading states
 * - Destructive action styling
 */
export const AIConfirmation = ({
	title = "Confirm Action",
	description,
	content,
	confirmLabel = "Confirm",
	cancelLabel = "Deny",
	onConfirm,
	onDeny,
	isLoading = false,
	isDestructive = false,
	className,
	...props
}: AIConfirmationWrapperProps) => {
	return (
		<AIConfirmationBase className={cn("not-prose", className)} {...props}>
			<ConfirmationTitle>{title}</ConfirmationTitle>
			{description && (
				<p className="text-muted-foreground text-sm">{description}</p>
			)}
			{content}

			<ConfirmationRequest>
				<ConfirmationActions className="mt-2">
					<ConfirmationAction
						onClick={onConfirm}
						disabled={isLoading}
					>
						{isLoading ? "Processing..." : confirmLabel}
					</ConfirmationAction>
					<Button
						variant={isDestructive ? "destructive" : "outline"}
						onClick={onDeny}
						disabled={isLoading}
						size="sm"
					>
						{cancelLabel}
					</Button>
				</ConfirmationActions>
			</ConfirmationRequest>

			<ConfirmationAccepted>
				<p className="text-green-600 text-sm">Action approved</p>
			</ConfirmationAccepted>

			<ConfirmationRejected>
				<p className="text-red-600 text-sm">Action denied</p>
			</ConfirmationRejected>
		</AIConfirmationBase>
	)
}

/**
 * Props for the AIToolApproval component
 */
export interface AIToolApprovalProps {
	/** Name of the tool requesting approval */
	toolName: string
	/** Description of what the tool will do */
	toolDescription?: string
	/** Parameters the tool will use */
	parameters?: Record<string, unknown>
	/** Current state of the tool */
	state: ExtendedToolState
	/** Handler when approved */
	onApprove?: () => void | Promise<void>
	/** Handler when denied */
	onDeny?: () => void
	/** Whether approval is loading */
	isLoading?: boolean
	/** Additional class names */
	className?: string
}

/**
 * Specialized confirmation for tool approval
 */
export const AIToolApproval = ({
	toolName,
	toolDescription,
	parameters,
	state,
	onApprove,
	onDeny,
	isLoading = false,
	className,
}: AIToolApprovalProps) => {
	const paramContent =
		parameters && Object.keys(parameters).length > 0 ? (
			<div className="mt-2 rounded-md bg-muted/50 p-2">
				<p className="mb-1 text-muted-foreground text-xs">
					Parameters:
				</p>
				<pre className="overflow-x-auto text-xs">
					{JSON.stringify(parameters, null, 2)}
				</pre>
			</div>
		) : undefined

	return (
		<AIConfirmationBase
			className={cn("not-prose", className)}
			state={state}
		>
			<ConfirmationTitle>Allow {toolName}?</ConfirmationTitle>
			{toolDescription && (
				<p className="text-muted-foreground text-sm">
					{toolDescription}
				</p>
			)}
			{paramContent}

			<ConfirmationRequest>
				<ConfirmationActions className="mt-2">
					<ConfirmationAction
						onClick={onApprove}
						disabled={isLoading}
					>
						{isLoading ? "Processing..." : "Allow"}
					</ConfirmationAction>
					<Button
						variant="outline"
						onClick={onDeny}
						disabled={isLoading}
						size="sm"
					>
						Deny
					</Button>
				</ConfirmationActions>
			</ConfirmationRequest>

			<ConfirmationAccepted>
				<p className="text-green-600 text-sm">Tool approved</p>
			</ConfirmationAccepted>

			<ConfirmationRejected>
				<p className="text-red-600 text-sm">Tool denied</p>
			</ConfirmationRejected>
		</AIConfirmationBase>
	)
}

export type { AIConfirmationProps }
