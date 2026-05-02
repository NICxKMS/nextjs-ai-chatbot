import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading skeleton for the chat layout.
 *
 * Mirrors the actual chat page structure: sticky header with
 * model selector placeholder, empty message area, and a
 * bottom-anchored input skeleton.
 */
export default function Loading() {
	return (
		<div
			aria-label="Loading chat"
			aria-live="polite"
			className="flex h-dvh min-w-0 flex-col bg-background"
			role="status"
		>
			{/* Header skeleton — matches ChatHeader layout */}
			<header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
				<Skeleton className="size-8 rounded-md" />
				<Skeleton className="h-8 w-32 rounded-md" />
				<div className="ml-auto flex items-center gap-1">
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
			</header>

			{/* Message area — empty with centered hint skeleton */}
			<div className="flex flex-1 items-center justify-center">
				<Skeleton className="h-4 w-48 rounded-md" />
			</div>

			{/* Input skeleton — matches MultimodalInput position */}
			<div className="sticky bottom-0 mx-auto flex w-full max-w-4xl px-2 pb-3 md:px-4 md:pb-4">
				<Skeleton className="h-[52px] w-full rounded-2xl" />
			</div>

			<span className="sr-only">Loading chat…</span>
		</div>
	)
}
