export default function AuthLoading() {
	return (
		<output className="flex w-full flex-col gap-6" aria-label="Loading authentication">
			{/* Heading skeleton */}
			<div className="flex flex-col items-center gap-2">
				<div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
				<div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
			</div>

			{/* Form fields skeleton */}
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
					<div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
				</div>
				<div className="flex flex-col gap-2">
					<div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
					<div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
				</div>
			</div>

			{/* Button skeleton */}
			<div className="h-10 w-full animate-pulse rounded-lg bg-muted" />

			<span className="sr-only">Loading authentication form…</span>
		</output>
	)
}
