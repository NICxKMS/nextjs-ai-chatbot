/**
 * AI Thinking Wrapper Component
 *
 * Project wrapper for ai-elements Reasoning primitive that adds:
 * - Streaming state tracking
 * - Auto-open during streaming
 * - Duration display
 * - Collapsible reasoning display
 *
 * @module components/ai/reasoning/thinking
 */

"use client"

import { useEffect, useRef, useState } from "react"
import {
	Reasoning as AIReasoningBase,
	type ReasoningProps as AIReasoningProps,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
import { cn } from "@/lib/utils"

/**
 * Props for the AIThinking wrapper component
 */
export interface AIThinkingProps extends Omit<AIReasoningProps, "children"> {
	/** The reasoning text content */
	reasoning: string
	/** Whether the reasoning is currently streaming */
	isStreaming?: boolean
	/** Whether to auto-open when streaming starts */
	autoOpen?: boolean
	/** Additional class names */
	className?: string
}

/**
 * AI Thinking wrapper component
 *
 * Displays AI reasoning with:
 * - Streaming indicator during generation
 * - Duration tracking
 * - Collapsible content
 * - Auto-open/close behavior
 */
export const AIThinking = ({
	reasoning,
	isStreaming = false,
	autoOpen = true,
	className,
	...props
}: AIThinkingProps) => {
	const [hasBeenStreaming, setHasBeenStreaming] = useState(isStreaming)
	const [isReasoningStreaming, setIsReasoningStreaming] = useState(false)
	const prevReasoningRef = useRef(reasoning)

	// Track if reasoning has been streaming
	useEffect(() => {
		if (isStreaming) {
			setHasBeenStreaming(true)
		}
	}, [isStreaming])

	// Track when reasoning content is actually changing (streaming)
	useEffect(() => {
		if (isStreaming && reasoning !== prevReasoningRef.current) {
			// Reasoning content is changing while loading - it's streaming
			setIsReasoningStreaming(true)
			prevReasoningRef.current = reasoning
		} else if (
			isReasoningStreaming &&
			(!isStreaming || reasoning === prevReasoningRef.current)
		) {
			// Content stopped changing or loading ended, reasoning is done
			setIsReasoningStreaming(false)
		}

		if (!isStreaming) {
			prevReasoningRef.current = reasoning
		}
	}, [isStreaming, reasoning, isReasoningStreaming])

	return (
		<AIReasoningBase
			className={cn("not-prose mb-4", className)}
			defaultOpen={autoOpen && hasBeenStreaming}
			isStreaming={isReasoningStreaming}
			{...props}
		>
			<ReasoningTrigger />
			<ReasoningContent>{reasoning}</ReasoningContent>
		</AIReasoningBase>
	)
}

/**
 * Props for the AIThinkingIndicator component
 */
export interface AIThinkingIndicatorProps {
	/** Whether the thinking is active */
	isActive?: boolean
	/** Custom label to display */
	label?: string
	/** Additional class names */
	className?: string
}

/**
 * Simple thinking indicator for loading states
 */
export const AIThinkingIndicator = ({
	isActive = true,
	label = "Thinking...",
	className,
}: AIThinkingIndicatorProps) => {
	if (!isActive) return null

	return (
		<div
			className={cn(
				"flex items-center gap-2 text-muted-foreground text-sm",
				className,
			)}
		>
			<div className="flex gap-1">
				<span className="animate-bounce [animation-delay:0ms]">●</span>
				<span className="animate-bounce [animation-delay:150ms]">
					●
				</span>
				<span className="animate-bounce [animation-delay:300ms]">
					●
				</span>
			</div>
			<span>{label}</span>
		</div>
	)
}

export type { AIReasoningProps }
