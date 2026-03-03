"use client"

import { useEffect, useRef, useState } from "react"

import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning"

interface MessageReasoningProps {
	/** Whether the parent message is currently streaming */
	isLoading: boolean
	/** The reasoning/chain-of-thought text content */
	reasoning: string
}

/**
 * Collapsible section for chain-of-thought reasoning display.
 *
 * Wraps the Reasoning ai-element primitives with streaming detection:
 * tracks when the reasoning text is actively changing to show appropriate
 * streaming indicators, and auto-collapses after streaming completes.
 */
export function MessageReasoning({ isLoading, reasoning }: MessageReasoningProps) {
	const [hasBeenStreaming, setHasBeenStreaming] = useState(isLoading)
	const [isReasoningStreaming, setIsReasoningStreaming] = useState(false)
	const prevReasoningRef = useRef(reasoning)

	useEffect(() => {
		if (isLoading) {
			setHasBeenStreaming(true)
		}
	}, [isLoading])

	// Track when reasoning content is actually changing (streaming)
	useEffect(() => {
		if (isLoading && reasoning !== prevReasoningRef.current) {
			// Reasoning content is changing while loading — it's streaming
			setIsReasoningStreaming(true)
			prevReasoningRef.current = reasoning
		} else if (isReasoningStreaming && (!isLoading || reasoning === prevReasoningRef.current)) {
			// Content stopped changing or loading ended — reasoning is done
			setIsReasoningStreaming(false)
		}

		if (!isLoading) {
			prevReasoningRef.current = reasoning
		}
	}, [isLoading, reasoning, isReasoningStreaming])

	return (
		<Reasoning
			data-testid="message-reasoning"
			defaultOpen={hasBeenStreaming}
			isStreaming={isReasoningStreaming}
		>
			<ReasoningTrigger />
			<ReasoningContent>{reasoning}</ReasoningContent>
		</Reasoning>
	)
}
