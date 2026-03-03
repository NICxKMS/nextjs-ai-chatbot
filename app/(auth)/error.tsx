"use client"

import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

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
