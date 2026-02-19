/**
 * Chat Loading Component
 *
 * Loading state for the chat route group.
 * Displays a centered spinner while the chat page loads.
 *
 * @module app/(chat)/loading
 */

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading fallback for chat routes.
 * Shows a centered spinner with loading text.
 */
export default function ChatLoading() {
	return (
		<div className="flex h-full w-full flex-col">
			<div className="flex-1 space-y-6 overflow-hidden p-4 md:p-6">
				<div className="flex justify-end">
					<Skeleton className="h-14 w-56 rounded-2xl rounded-br-md" />
				</div>
				<div className="flex justify-start">
					<div className="w-full max-w-xl space-y-2">
						<Skeleton className="h-4 w-3/5" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-4/5" />
					</div>
				</div>
				<div className="flex justify-end">
					<Skeleton className="h-11 w-44 rounded-2xl rounded-br-md" />
				</div>
			</div>
			<div className="border-t bg-background p-4">
				<Skeleton className="h-12 w-full rounded-2xl" />
			</div>
		</div>
	)
}
