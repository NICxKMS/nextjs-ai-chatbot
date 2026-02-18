/**
 * Message Reasoning Component
 *
 * Displays AI reasoning/thinking process in a collapsible section.
 * Uses the ai-elements Reasoning component for proper Collapsible integration
 * with auto-close guard and markdown rendering.
 *
 * @module features/chat/components
 */

"use client"

import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning"

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
// Components
// =============================================================================

/**
 * Message Reasoning Component
 *
 * Displays AI reasoning in a collapsible section with:
 * - Auto-open during streaming
 * - Auto-close when streaming completes (with hasAutoClosed guard)
 * - Duration tracking
 * - Markdown rendering via Streamdown
 */
export function MessageReasoning({
	isLoading,
	reasoning,
}: MessageReasoningProps) {
	return (
		<Reasoning isStreaming={isLoading} data-testid="message-reasoning">
			<ReasoningTrigger />
			<ReasoningContent>{reasoning}</ReasoningContent>
		</Reasoning>
	)
}
