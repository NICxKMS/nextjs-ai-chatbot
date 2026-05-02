import { Skeleton } from "@/components/ui/skeleton"

const SKELETON_WIDTHS = [44, 32, 28, 64, 52] as const

export function SidebarSkeleton() {
	return (
		<div
			className="group peer hidden text-sidebar-foreground md:block"
			data-side="left"
			data-state="expanded"
			data-variant="sidebar"
		>
			{/* Spacer div for layout — matches sidebar.tsx structure */}
			<div className="relative w-64 bg-transparent" />

			{/* Fixed sidebar — matches sidebar.tsx fixed panel */}
			<div className="fixed inset-y-0 left-0 z-10 hidden h-svh w-64 border-r md:flex">
				<div className="flex h-full w-full flex-col bg-sidebar" data-sidebar="sidebar">
					{/* Header skeleton */}
					<div
						aria-busy="true"
						className="flex h-12 items-center justify-between border-b px-4"
					>
						<Skeleton className="h-5 w-20 bg-sidebar-accent-foreground/10" />
						<Skeleton className="h-8 w-8 bg-sidebar-accent-foreground/10" />
					</div>

					{/* Content skeleton */}
					<div
						aria-busy="true"
						className="flex flex-1 flex-col overflow-hidden px-2 py-2"
					>
						{/* "Today" label */}
						<div className="px-2 py-1 text-sidebar-foreground/50 text-xs">Today</div>

						{/* Chat item skeletons with staggered animation */}
						<div className="flex h-full flex-col">
							{SKELETON_WIDTHS.map((width, index) => (
								<div
									className="flex h-8 items-center gap-2 rounded-md px-2"
									key={width}
								>
									<Skeleton
										className="h-4 max-w-(--skeleton-width) flex-1 bg-sidebar-accent-foreground/10"
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
					<div aria-busy="true" className="border-t p-2">
						<div className="flex h-10 items-center gap-2 rounded-md px-2">
							<Skeleton className="size-8 rounded-full bg-sidebar-accent-foreground/10" />
							<Skeleton className="h-4 w-24 bg-sidebar-accent-foreground/10" />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
