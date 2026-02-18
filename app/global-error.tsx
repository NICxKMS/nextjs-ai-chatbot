/**
 * Global Error Boundary
 *
 * Catches errors in the root layout, including errors that occur during
 * hydration. Must wrap the entire html and body tags since it replaces
 * the root layout when an error occurs.
 *
 * @module app/global-error
 */

"use client"

import { useEffect } from "react"

/**
 * Global error boundary props
 */
interface GlobalErrorProps {
	/** The error that was thrown */
	error: Error & { digest?: string }
}

/**
 * Global error boundary component.
 *
 * This component catches errors in the root layout. It must include
 * its own html and body tags because it replaces the root layout
 * when an error occurs.
 */
export default function GlobalError({ error }: GlobalErrorProps) {
	useEffect(() => {
		// Only log errors in development to avoid exposing sensitive info in production
		if (process.env.NODE_ENV === "development") {
			console.error("Global error:", error)
		}
	}, [error])

	return (
		<html lang="en">
			<body>
				<div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
					<div className="flex flex-col items-center gap-4 text-center">
						<h1 className="text-2xl font-bold">
							Something went wrong
						</h1>
						<p className="text-muted-foreground">
							An unexpected error occurred. Please refresh the
							page.
						</p>
						{error.digest && (
							<p className="text-muted-foreground text-sm">
								Error ID: {error.digest}
							</p>
						)}
						<button
							className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
							onClick={() => window.location.reload()}
							type="button"
						>
							Refresh Page
						</button>
					</div>
				</div>
			</body>
		</html>
	)
}
