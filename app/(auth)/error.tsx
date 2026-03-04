"use client"

import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

/**
 * Error boundary for the (auth) route group.
 * Catches runtime errors in auth pages (login, register) and provides recovery.
 * Renders within the auth layout's centered container.
 */
export default function AuthError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error("Auth error:", error)
	}, [error])

	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
			<div className="space-y-2">
				<h2 className="font-semibold text-2xl tracking-tight">Something went wrong</h2>
				<p className="text-muted-foreground text-sm">
					An error occurred during authentication. Please try again.
				</p>
				{error.digest && (
					<p className="text-muted-foreground/60 text-xs">Error ID: {error.digest}</p>
				)}
			</div>

			<div className="flex gap-3">
				<Button onClick={() => reset()} variant="default">
					Try Again
				</Button>
				<Button asChild variant="outline">
					<Link href="/">Go Home</Link>
				</Button>
			</div>
		</div>
	)
}
