/**
 * Message Reasoning Component
 *
 * Displays AI reasoning/thinking process in a collapsible section.
 *
 * @module features/chat/components
 */

"use client"

import { useEffect, useRef, useState } from "react"

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the MessageReasoning component
 */
export interface MessageReasoningProps {
	/** Whether the message is still loading/streaming */
	isLoading: boolean
	/** The reasoning content to display */
	reasoning: string
}

// =============================================================================
// Icon Components
// =============================================================================

/**
 * Brain Icon for reasoning indicator
 */
function BrainIcon() {
	return (
		<svg
			aria-hidden="true"
			height="16"
			style={{ color: "currentcolor" }}
			viewBox="0 0 24 24"
			width="16"
		>
			<title>Reasoning</title>
			<path
				d="M12 2C8.5 2 6 4.5 6 7c0 1.5.5 2.5 1 3.5-.5.5-1 1.5-1 2.5 0 2 1.5 3.5 3.5 3.5.5 0 1-.1 1.5-.3.3 1.7 1.5 3.3 3 3.3s2.7-1.6 3-3.3c.5.2 1 .3 1.5.3 2 0 3.5-1.5 3.5-3.5 0-1-.5-2-1-2.5.5-1 1-2 1-3.5 0-2.5-2.5-5-6-5z"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	)
}

/**
 * Chevron Down Icon for collapsible trigger
 */
function ChevronDownIcon({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			height="16"
			style={{ color: "currentcolor" }}
			viewBox="0 0 16 16"
			width="16"
		>
			<title>Toggle</title>
			<path
				clipRule="evenodd"
				d="M3.21967 5.46967L3.75 4.93934L4.81066 6L4.28033 6.53033L7.75 10L8.28033 10.5303L7.75 11.0607L7.21967 10.5303L3.21967 6.53033L2.68934 6L3.21967 5.46967ZM11.75 4.93934L12.2803 5.46967L12.8107 6L12.2803 6.53033L8.28033 10.5303L7.75 11.0607L6.68934 10L7.21967 9.46967L10.6893 6L11.2197 5.46967L11.75 4.93934Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	)
}

// =============================================================================
// Components
// =============================================================================

/**
 * Shimmer Effect Component
 *
 * Animated shimmer for loading state.
 */
function Shimmer({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex items-center">
			{children}
			<span className="ml-1 animate-pulse">...</span>
		</span>
	)
}

/**
 * Message Reasoning Component
 *
 * Displays AI reasoning in a collapsible section with:
 * - Auto-open during streaming
 * - Auto-close when streaming completes
 * - Duration tracking
 * - Collapsible trigger with brain icon
 */
export function MessageReasoning({
	isLoading,
	reasoning,
}: MessageReasoningProps) {
	const [hasBeenStreaming, setHasBeenStreaming] = useState(isLoading)
	const [isReasoningStreaming, setIsReasoningStreaming] = useState(false)
	const [isOpen, setIsOpen] = useState(true)
	const prevReasoningRef = useRef(reasoning)

	// Track when streaming starts
	useEffect(() => {
		if (isLoading) {
			setHasBeenStreaming(true)
		}
	}, [isLoading])

	// Track when reasoning content is actually changing (streaming)
	useEffect(() => {
		if (isLoading && reasoning !== prevReasoningRef.current) {
			// Reasoning content is changing while loading - it's streaming
			setIsReasoningStreaming(true)
			prevReasoningRef.current = reasoning
		} else if (
			isReasoningStreaming &&
			(!isLoading || reasoning === prevReasoningRef.current)
		) {
			// Content stopped changing or loading ended, reasoning is done
			setIsReasoningStreaming(false)
		}

		if (!isLoading) {
			prevReasoningRef.current = reasoning
		}
	}, [isLoading, reasoning, isReasoningStreaming])

	// Auto-close after streaming ends (with delay)
	useEffect(() => {
		if (hasBeenStreaming && !isLoading && isOpen) {
			const timer = setTimeout(() => {
				setIsOpen(false)
			}, 1000)

			return () => clearTimeout(timer)
		}
		return undefined
	}, [hasBeenStreaming, isLoading, isOpen])

	/**
	 * Get thinking message based on state
	 */
	const getThinkingMessage = () => {
		if (isReasoningStreaming || isLoading) {
			return <Shimmer>Thinking</Shimmer>
		}
		return <p>Thought for a few seconds</p>
	}

	return (
		<div className="not-prose mb-4" data-testid="message-reasoning">
			<button
				className="flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
				onClick={() => setIsOpen(!isOpen)}
				type="button"
			>
				<BrainIcon />
				{getThinkingMessage()}
				<ChevronDownIcon
					className={`size-4 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
				/>
			</button>

			{isOpen && (
				<div className="mt-4 text-sm text-muted-foreground animate-in slide-in-from-top-2 duration-200">
					{reasoning}
				</div>
			)}
		</div>
	)
}
