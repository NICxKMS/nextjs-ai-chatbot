/**
 * Auth Layout Component
 *
 * Layout for authentication pages (login, register, forgot-password).
 * Centers content in a card design and redirects authenticated users.
 *
 * @module app/(auth)/layout
 */

import type { Metadata } from "next"
import { redirect } from "next/navigation"
import type { JSX, ReactNode } from "react"

import { getSession } from "@/lib/auth/session"

// =============================================================================
// Metadata Configuration
// =============================================================================

export const metadata: Metadata = {
	title: "Sign In",
	description:
		"Sign in to your AI Assistant account to continue chatting with AI models.",
	openGraph: {
		title: "Sign In | AI Assistant",
		description:
			"Sign in to your AI Assistant account to continue chatting with AI models.",
	},
}

// =============================================================================
// Auth Layout Component
// =============================================================================

/**
 * Auth layout that centers content and handles authenticated user redirects.
 *
 * @param props - Component props
 * @param props.children - Child page content
 *
 * @example
 * ```tsx
 * // Wraps login, register, forgot-password pages
 * // Authenticated users are redirected to /chat
 * ```
 */
export default async function AuthLayout({
	children,
}: Readonly<{
	children: ReactNode
}>): Promise<JSX.Element> {
	// Check if user is already authenticated
	const session = await getSession()

	// Redirect authenticated users to chat
	if (session?.user) {
		redirect("/chat")
	}

	return (
		<div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
			<div className="w-full max-w-md">{children}</div>
		</div>
	)
}
