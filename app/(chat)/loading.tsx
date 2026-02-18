/**
 * Chat Loading Component
 *
 * Loading state for the chat route group.
 * Displays a centered spinner while the chat page loads.
 *
 * @module app/(chat)/loading
 */

import { Loader } from "@/components/ai-elements/loader"

/**
 * Loading fallback for chat routes.
 * Shows a centered spinner with loading text.
 */
export default function ChatLoading() {
	return (
		<div className="flex h-dvh w-full items-center justify-center">
			<div className="flex flex-col items-center gap-4">
				<Loader size={32} />
				<p className="text-muted-foreground text-sm">Loading chat...</p>
			</div>
		</div>
	)
}
