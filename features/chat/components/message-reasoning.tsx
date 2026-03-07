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

	// Track streaming state: latch hasBeenStreaming once loading is detected,
	// and detect active reasoning streaming by comparing content changes.
	useEffect(() => {
		if (isLoading) {
			setHasBeenStreaming(true)
		}

		const reasoningChanged = reasoning !== prevReasoningRef.current

		if (isLoading && reasoningChanged) {
			setIsReasoningStreaming(true)
		} else if (isReasoningStreaming && (!isLoading || !reasoningChanged)) {
			setIsReasoningStreaming(false)
		}

		prevReasoningRef.current = reasoning
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
