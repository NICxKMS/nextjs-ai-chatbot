/**
 * Chat Loading State (Dynamic Route)
 *
 * Displays skeleton UI while chat data is being loaded.
 *
 * @module app/(chat)/chat/[id]/loading
 */

export default function ChatLoading() {
    return (
        <div className="flex h-full flex-col">
            {/* Header skeleton */}
            <div className="flex h-14 items-center border-b px-4">
                <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            </div>

            {/* Messages skeleton */}
            <div className="flex-1 space-y-6 p-4">
                {[1, 2, 3].map((i) => (
                    <div className="flex gap-4" key={i}>
                        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Input skeleton */}
            <div className="border-t p-4">
                <div className="h-12 animate-pulse rounded-lg bg-muted" />
            </div>
        </div>
    );
}
