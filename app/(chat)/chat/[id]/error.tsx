/**
 * Chat Error Boundary
 *
 * Route-level error boundary for individual chat pages.
 * Catches runtime errors and provides recovery options.
 *
 * @module app/(chat)/chat/[id]/error
 */

"use client"

import { AlertCircle, Home, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

/**
 * Error boundary props
 */
interface ChatErrorProps {
	/** The error that was thrown */
	error: Error & { digest?: string }
	/** Function to reset the error boundary and retry */
	reset: () => void
}

/**
 * Error boundary for individual chat pages.
 *
 * Catches errors during chat loading and provides:
 * - Error digest display for debugging
 * - "Go Home" navigation button
 * - "Try Again" reset button
 */
export default function ChatError({ error, reset }: ChatErrorProps) {
	const router = useRouter()

	return (
		<div className="flex h-dvh w-full flex-col items-center justify-center gap-6 px-4">
			<div className="flex flex-col items-center gap-2 text-center">
				<AlertCircle className="h-12 w-12 text-destructive" />
				<h2 className="font-semibold text-xl">Something went wrong</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					An error occurred while loading this chat. You can try again
					or return to the home page.
				</p>
				{error.digest && (
					<p className="text-muted-foreground/60 text-xs">
						Error ID: {error.digest}
					</p>
				)}
			</div>
			<div className="flex gap-3">
				<Button onClick={() => router.push("/")} variant="outline">
					<Home className="mr-2 h-4 w-4" />
					Go Home
				</Button>
				<Button onClick={() => reset()}>
					<RefreshCw className="mr-2 h-4 w-4" />
					Try Again
				</Button>
			</div>
		</div>
	)
}
