/**
 * AI Reasoning Steps Wrapper Component
 *
 * Project wrapper for ai-elements ChainOfThought primitive that adds:
 * - Step-by-step reasoning display
 * - Collapsible reasoning sections
 * - Status indicators for each step
 *
 * @module components/ai/reasoning/steps
 */

"use client"

import type { ReactNode } from "react"
import {
	ChainOfThought as AIChainOfThoughtBase,
	type ChainOfThoughtProps as AIChainOfThoughtProps,
	ChainOfThoughtContent,
	ChainOfThoughtHeader,
	ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought"
import { cn } from "@/lib/utils"

/**
 * Status for a reasoning step
 */
export type ReasoningStepStatus = "pending" | "active" | "completed" | "error"

/**
 * Single reasoning step data
 */
export interface ReasoningStep {
	/** Unique identifier for the step */
	id: string
	/** Title/label for the step */
	title: string
	/** Optional description */
	description?: string
	/** Status of the step */
	status?: ReasoningStepStatus
	/** Optional icon */
	icon?: ReactNode
}

/**
 * Props for the AIReasoningSteps wrapper component
 */
export interface AIReasoningStepsProps
	extends Omit<AIChainOfThoughtProps, "children"> {
	/** Array of reasoning steps to display */
	steps: ReasoningStep[]
	/** Whether the steps are currently streaming */
	isStreaming?: boolean
	/** Title for the reasoning section */
	title?: string
	/** Whether to start expanded */
	defaultExpanded?: boolean
	/** Additional class names */
	className?: string
}

/**
 * Get status indicator styles
 */
const getStatusStyles = (status: ReasoningStepStatus): string => {
	switch (status) {
		case "active":
			return "text-blue-500 animate-pulse"
		case "completed":
			return "text-green-500"
		case "error":
			return "text-red-500"
		default:
			return "text-muted-foreground"
	}
}

/**
 * Get status indicator icon
 */
const getStatusIcon = (status: ReasoningStepStatus): ReactNode => {
	switch (status) {
		case "active":
			return <span className="animate-spin">◐</span>
		case "completed":
			return "✓"
		case "error":
			return "✗"
		default:
			return "○"
	}
}

/**
 * AI Reasoning Steps wrapper component
 *
 * Displays a series of reasoning steps with:
 * - Status indicators
 * - Collapsible sections
 * - Streaming state handling
 */
export const AIReasoningSteps = ({
	steps,
	isStreaming = false,
	title = "Reasoning Steps",
	defaultExpanded = false,
	className,
	...props
}: AIReasoningStepsProps) => {
	return (
		<AIChainOfThoughtBase
			className={cn("not-prose mb-4", className)}
			defaultOpen={defaultExpanded}
			{...props}
		>
			<ChainOfThoughtHeader className="flex items-center gap-2 text-muted-foreground text-sm">
				<span className="font-medium">{title}</span>
				{isStreaming && (
					<span className="animate-pulse text-blue-500">●</span>
				)}
			</ChainOfThoughtHeader>

			<ChainOfThoughtContent className="mt-2 space-y-2">
				{steps.map((step) => {
					const status =
						step.status ?? (isStreaming ? "pending" : "completed")

					return (
						<ChainOfThoughtStep
							key={step.id}
							label={step.title}
							description={step.description}
							status={
								status === "completed"
									? "complete"
									: status === "active"
										? "active"
										: "pending"
							}
							className={cn(
								"flex items-start gap-2 rounded-md p-2",
								status === "active" && "bg-muted/50",
							)}
						/>
					)
				})}
			</ChainOfThoughtContent>
		</AIChainOfThoughtBase>
	)
}

/**
 * Props for a single AIReasoningStep component
 */
export interface AIReasoningStepProps {
	/** The step data */
	step: ReasoningStep
	/** Additional class names */
	className?: string
}

/**
 * Single reasoning step component for custom layouts
 */
export const AIReasoningStep = ({ step, className }: AIReasoningStepProps) => {
	const status = step.status ?? "pending"

	return (
		<div
			className={cn(
				"flex items-start gap-2 rounded-md p-2",
				status === "active" && "bg-muted/50",
				className,
			)}
		>
			<span className={cn("mt-0.5", getStatusStyles(status))}>
				{step.icon ?? getStatusIcon(status)}
			</span>
			<div className="flex-1">
				<span className="font-medium text-sm">{step.title}</span>
				{step.description && (
					<p className="text-muted-foreground text-xs">
						{step.description}
					</p>
				)}
			</div>
		</div>
	)
}

export type { AIChainOfThoughtProps }
