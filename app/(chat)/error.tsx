"use client"

import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

/**
 * Error boundary for the (chat) route group.
 * Renders within the chat layout, preserving the sidebar for navigation.
 * Only replaces the main content area (SidebarInset children).
 */
export default function ChatError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error("Chat error:", error.digest ?? error.message)
	}, [error])

	return (
		<div
			role="alert"
			className="flex h-dvh w-full flex-col items-center justify-center gap-6 px-4"
		>
			<div className="flex flex-col items-center gap-2 text-center">
				<h2 className="font-semibold text-xl">Something went wrong</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					An error occurred while loading this chat. You can try again or return to the
					home page.
				</p>
				{error.digest && (
					<p className="text-muted-foreground/60 text-xs">Error ID: {error.digest}</p>
				)}
			</div>
			<div className="flex gap-3">
				<Button asChild variant="outline">
					<Link href="/">Go Home</Link>
				</Button>
				<Button onClick={() => reset()}>Try Again</Button>
			</div>
		</div>
	)
}
