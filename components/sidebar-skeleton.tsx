export function SidebarSkeleton() {
	return (
		<div className="flex h-full w-64 flex-col gap-2 border-r bg-sidebar p-4">
			<div className="h-10 w-full animate-pulse rounded bg-muted" />
			<div className="flex flex-col gap-2">
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
		</div>
	);
}
