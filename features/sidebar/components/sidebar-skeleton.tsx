/**
 * Sidebar Skeleton Component
 *
 * Loading skeleton for sidebar during SSR/initial load.
 * Matches sidebar structure for CLS-free transitions.
 *
 * @module features/sidebar/components/sidebar-skeleton
 */

/**
 * Sidebar loading skeleton
 *
 * Matches actual sidebar structure for smooth transitions.
 * Displays placeholder elements that mimic the real sidebar layout.
 */
export function SidebarSkeleton() {
	// Matches the loading state in sidebar-history for consistent CLS-free transitions
	const skeletonWidths = [44, 32, 28, 64, 52]

	return (
		<div
			className="group peer hidden text-sidebar-foreground md:block"
			data-side="left"
			data-state="expanded"
			data-variant="sidebar"
		>
			{/* Spacer div for layout */}
			<div className="relative w-64 bg-transparent" />

			{/* Fixed sidebar */}
			<div className="fixed inset-y-0 left-0 z-10 hidden h-svh w-64 border-r md:flex">
				<div
					className="flex h-full w-full flex-col bg-sidebar"
					data-sidebar="sidebar"
				>
					{/* Header skeleton */}
					<div className="flex h-12 items-center justify-between border-b px-4">
						<div className="h-5 w-20 animate-pulse rounded bg-sidebar-accent-foreground/10" />
						<div className="h-8 w-8 animate-pulse rounded bg-sidebar-accent-foreground/10" />
					</div>

					{/* Content skeleton */}
					<div className="flex flex-1 flex-col overflow-hidden px-2 py-2">
						{/* "Today" header */}
						<div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
							Today
						</div>

						{/* Chat items skeleton */}
						<div aria-busy="true" className="flex h-full flex-col">
							{skeletonWidths.map((width, index) => (
								<div
									className="flex h-8 items-center gap-2 rounded-md px-2"
									key={`skeleton-${width}`}
								>
									<div
										className="h-4 max-w-(--skeleton-width) flex-1 animate-pulse rounded-md bg-sidebar-accent-foreground/10"
										style={
											{
												"--skeleton-width": `${width}%`,
												animationDelay: `${index * 50}ms`,
											} as React.CSSProperties
										}
									/>
								</div>
							))}
						</div>
					</div>

					{/* Footer skeleton */}
					<div className="border-t p-2">
						<div className="flex h-10 items-center gap-2 rounded-md px-2">
							<div className="size-8 animate-pulse rounded-full bg-sidebar-accent-foreground/10" />
							<div className="h-4 w-24 animate-pulse rounded bg-sidebar-accent-foreground/10" />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
