"use client"

import { cjk } from "@streamdown/cjk"
import { code } from "@streamdown/code"
import { math } from "@streamdown/math"
import { mermaid } from "@streamdown/mermaid"
import { BrainIcon, ChevronDownIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Streamdown } from "streamdown"

import { Shimmer } from "@/components/ai-elements/shimmer"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

const AUTO_CLOSE_DELAY_MS = 1000
const MS_IN_SECOND = 1000
const streamdownPlugins = { cjk, code, math, mermaid }

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
	const [isOpen, setIsOpen] = useState(isLoading)
	const [hasAutoClosed, setHasAutoClosed] = useState(false)
	const [duration, setDuration] = useState<number | undefined>()
	const prevReasoningRef = useRef(reasoning)
	const hasEverStreamedRef = useRef(isLoading)
	const startTimeRef = useRef<number | null>(isLoading ? Date.now() : null)

	// Track streaming state: latch hasBeenStreaming once loading is detected,
	// and detect active reasoning streaming by comparing content changes.
	useEffect(() => {
		if (isLoading) {
			setHasBeenStreaming(true)
			hasEverStreamedRef.current = true
			if (startTimeRef.current === null) {
				startTimeRef.current = Date.now()
			}
		} else if (startTimeRef.current !== null) {
			setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_SECOND))
			startTimeRef.current = null
		}

		const reasoningChanged = reasoning !== prevReasoningRef.current

		if (isLoading && reasoningChanged) {
			setIsReasoningStreaming(true)
		} else if (isReasoningStreaming && (!isLoading || !reasoningChanged)) {
			setIsReasoningStreaming(false)
		}

		prevReasoningRef.current = reasoning
	}, [isLoading, reasoning, isReasoningStreaming])

	useEffect(() => {
		if (isReasoningStreaming) {
			setIsOpen(true)
		}
	}, [isReasoningStreaming])

	useEffect(() => {
		if (hasEverStreamedRef.current && !isReasoningStreaming && isOpen && !hasAutoClosed) {
			const timer = setTimeout(() => {
				setIsOpen(false)
				setHasAutoClosed(true)
			}, AUTO_CLOSE_DELAY_MS)

			return () => clearTimeout(timer)
		}
	}, [hasAutoClosed, isOpen, isReasoningStreaming])

	const thinkingLabel = useMemo(() => {
		if (isReasoningStreaming || duration === 0) {
			return <Shimmer duration={1}>Thinking...</Shimmer>
		}
		if (duration === undefined) {
			return <p>Thought for a few seconds</p>
		}
		return <p>Thought for {duration} seconds</p>
	}, [duration, isReasoningStreaming])

	return (
		<Collapsible
			className="not-prose mb-4"
			data-testid="message-reasoning"
			onOpenChange={setIsOpen}
			open={isOpen || (hasBeenStreaming && !hasAutoClosed && isReasoningStreaming)}
		>
			<CollapsibleTrigger className="flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
				<BrainIcon className="size-4" />
				{thinkingLabel}
				<ChevronDownIcon
					className={cn(
						"size-4 transition-transform",
						isOpen ? "rotate-180" : "rotate-0",
					)}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent className="mt-4 text-sm text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2">
				<Streamdown plugins={streamdownPlugins}>{reasoning}</Streamdown>
			</CollapsibleContent>
		</Collapsible>
	)
}
