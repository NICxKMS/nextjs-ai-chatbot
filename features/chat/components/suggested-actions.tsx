"use client"

import { memo } from "react"

import { Suggestion } from "@/components/ai-elements/suggestion"
import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"

const SUGGESTED_ACTIONS = [
	"What are the advantages of using Next.js?",
	"Write code to demonstrate Dijkstra's algorithm",
	"Help me write an essay about Silicon Valley",
	"What is the weather in San Francisco?",
] as const

function PureSuggestedActions() {
	const { sendMessage } = useChatSessionContext()

	return (
		<div className="grid w-full gap-2 sm:grid-cols-2" data-testid="suggested-actions">
			{SUGGESTED_ACTIONS.map((action) => (
				<Suggestion
					className="h-auto w-full whitespace-normal p-3 text-left"
					key={action}
					onClick={sendMessage}
					suggestion={action}
				>
					{action}
				</Suggestion>
			))}
		</div>
	)
}

export const SuggestedActions = memo(PureSuggestedActions)
