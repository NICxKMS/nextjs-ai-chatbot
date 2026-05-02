"use client"

import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

/**
 * Chat-specific error boundary — catches errors within a single chat conversation.
 * Renders within the chat layout, so the sidebar remains visible and navigable.
 * More specific than the parent (chat) error boundary — handles per-conversation failures
 * like missing messages, stream errors, or invalid chat state.
 */
export default function ChatConversationError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error("Chat conversation error:", error.digest ?? error.message)
	}, [error])

	return (
		<div
			role="alert"
			className="flex h-dvh min-w-0 flex-col items-center justify-center gap-6 bg-background px-4"
		>
			<div className="flex flex-col items-center gap-2 text-center">
				<h2 className="font-semibold text-xl">Failed to load conversation</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					Something went wrong while loading this chat. The conversation may have been
					deleted or an unexpected error occurred.
				</p>
				{error.digest && (
					<p className="text-muted-foreground/60 text-xs">Error ID: {error.digest}</p>
				)}
			</div>
			<div className="flex gap-3">
				<Button asChild variant="outline">
					<Link href="/">New Chat</Link>
				</Button>
				<Button onClick={() => reset()}>Try Again</Button>
			</div>
		</div>
	)
}
