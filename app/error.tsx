/**
 * Error Boundary Component
 *
 * Root error boundary for the application. Catches errors and provides
 * a user-friendly error message with a reset button.
 *
 * @module app/error
 */

"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

/**
 * Error boundary props
 */
interface ErrorProps {
	/** The error that was thrown */
	error: Error & { digest?: string }
	/** Function to reset the error boundary and retry */
	reset: () => void
}

/**
 * Root error boundary component.
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the error, and displays a fallback UI with a reset button.
 */
export default function RootError({ error, reset }: ErrorProps) {
	useEffect(() => {
		// Only log errors in development to avoid exposing sensitive info in production
		if (process.env.NODE_ENV === "development") {
			console.error("Error caught by error boundary:", error)
		}
	}, [error])

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
			<div className="flex flex-col items-center gap-6 text-center">
				<div className="flex flex-col items-center gap-2">
					<AlertCircle className="h-16 w-16 text-destructive" />
					<h1 className="text-3xl font-bold text-foreground">
						Something went wrong
					</h1>
				</div>

				<p className="max-w-md text-muted-foreground">
					An unexpected error occurred. Please try again. If the
					problem persists, contact support.
				</p>

				{error.digest && (
					<p className="text-muted-foreground text-sm">
						Error ID: {error.digest}
					</p>
				)}

				<Button onClick={reset} size="lg" variant="outline">
					<RefreshCw className="mr-2 h-4 w-4" />
					Try Again
				</Button>
			</div>
		</div>
	)
}
