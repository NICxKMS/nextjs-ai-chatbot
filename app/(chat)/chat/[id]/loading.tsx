/**
 * Chat ID Loading Component
 *
 * Loading state for individual chat conversations.
 * Displays message skeletons while the chat loads.
 *
 * @module app/(chat)/chat/[id]/loading
 */

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading fallback for individual chat pages.
 * Shows message skeleton UI while chat data loads.
 */
export default function ChatIdLoading() {
	return (
		<div className="flex h-full w-full flex-col overflow-y-auto pb-20">
			{/* Message skeletons */}
			<div className="flex flex-col gap-6 p-4 md:p-6">
				{/* User message skeleton */}
				<div className="flex justify-end">
					<div className="max-w-[80%] md:max-w-[70%]">
						<div className="flex flex-col items-end gap-2">
							<Skeleton className="h-16 w-64 rounded-2xl rounded-br-md" />
						</div>
					</div>
				</div>

				{/* Assistant message skeleton */}
				<div className="flex justify-start">
					<div className="max-w-[80%] md:max-w-[70%]">
						<div className="flex flex-col gap-2">
							<Skeleton className="h-4 w-48" />
							<Skeleton className="h-4 w-full max-w-md" />
							<Skeleton className="h-4 w-3/4 max-w-sm" />
						</div>
					</div>
				</div>

				{/* Another user message skeleton */}
				<div className="flex justify-end">
					<div className="max-w-[80%] md:max-w-[70%]">
						<div className="flex flex-col items-end gap-2">
							<Skeleton className="h-12 w-48 rounded-2xl rounded-br-md" />
						</div>
					</div>
				</div>

				{/* Another assistant message skeleton */}
				<div className="flex justify-start">
					<div className="max-w-[80%] md:max-w-[70%]">
						<div className="flex flex-col gap-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-full max-w-lg" />
							<Skeleton className="h-4 w-2/3 max-w-xs" />
							<Skeleton className="h-4 w-1/2 max-w-xs" />
						</div>
					</div>
				</div>
			</div>

			{/* Input skeleton at bottom */}
			<div className="fixed bottom-4 left-0 right-0 mx-auto max-w-3xl px-4">
				<Skeleton className="h-14 w-full rounded-2xl" />
			</div>
		</div>
	)
}
