export function SidebarSkeleton() {
    return (
        <div className="hidden h-svh w-64 flex-shrink-0 flex-col gap-2 border-r bg-sidebar p-4 md:flex">
            {/* Header skeleton with same height as actual header */}
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            {/* Chat history items skeleton */}
            <div className="flex flex-1 flex-col gap-2">
                {Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map(
                    (key, i) => (
                        <div
                            className="h-8 w-full animate-pulse rounded bg-muted"
                            key={key}
                            style={{ animationDelay: `${i * 100}ms` }}
                        />
                    )
                )}
            </div>
            {/* Footer skeleton matching SidebarUserNav height */}
            <div className="mt-auto">
                <div className="flex h-10 items-center gap-2 rounded bg-muted/50 p-2">
                    <div className="size-6 animate-pulse rounded-full bg-muted" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                </div>
            </div>
        </div>
    );
}
