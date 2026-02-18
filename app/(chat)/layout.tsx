/**
 * Chat Layout Component
 *
 * Layout for chat pages with sidebar integration.
 * Provides sidebar context, data stream context, optimistic chats context, settings context, and auth context.
 *
 * @module app/(chat)/layout
 */

import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import type { JSX, ReactNode } from "react"
import { Suspense } from "react"
import { Loader } from "@/components/ai-elements/loader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { NoticeToastHandler } from "@/features/chat/components/notice-toast-handler"
import { DataStreamProvider } from "@/features/chat/hooks/use-data-stream"
import { SettingsProvider } from "@/features/settings"
import { AppSidebar } from "@/features/sidebar/components/sidebar"
import { SidebarSkeleton } from "@/features/sidebar/components/sidebar-skeleton"
import { OptimisticChatsProvider } from "@/features/sidebar/hooks"
import { getSession } from "@/lib/auth/session"

// =============================================================================
// Metadata Configuration
// =============================================================================

export const metadata: Metadata = {
	title: "Chat",
	description:
		"Start a conversation with AI Assistant. Chat with multiple AI models, create artifacts, and collaborate in real-time.",
	openGraph: {
		title: "Chat | AI Assistant",
		description:
			"Start a conversation with AI Assistant. Chat with multiple AI models, create artifacts, and collaborate in real-time.",
	},
}

// =============================================================================
// Chat Layout Component
// =============================================================================

/**
 * Chat layout with sidebar integration.
 *
 * Features:
 * - Sidebar with history and user navigation
 * - Data stream provider for real-time updates
 * - Protected route (redirects to login if not authenticated)
 * - Mobile-responsive with sidebar state persistence
 *
 * @param props - Component props
 * @param props.children - Child page content
 */
export default async function ChatLayout({
	children,
}: Readonly<{
	children: ReactNode
}>): Promise<JSX.Element> {
	// Check for session (supports both authenticated and guest users)
	const session = await getSession()

	// Redirect to login if no session exists
	// Note: Guest sessions are created automatically by getSession
	if (!session?.user) {
		redirect("/login")
	}

	// Get initial sidebar state from cookies
	const cookieStore = await cookies()
	const headersList = await headers()

	// Detect mobile device from headers (set by middleware)
	const isMobile = headersList.get("x-device-type") === "mobile"

	// Get sidebar open state from cookie (default: open)
	const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

	return (
		<OptimisticChatsProvider>
			<SettingsProvider>
				<SidebarProvider
					defaultOpen={sidebarOpen}
					initialIsMobile={isMobile}
				>
					<Suspense fallback={<SidebarSkeleton />}>
						<AppSidebar />
					</Suspense>
					<SidebarInset>
						{/* Notice toast handler for URL parameter notifications */}
						<Suspense fallback={null}>
							<NoticeToastHandler />
						</Suspense>
						<Suspense
							fallback={
								<div className="flex h-full w-full items-center justify-center">
									<Loader size={24} />
								</div>
							}
						>
							<DataStreamProvider>{children}</DataStreamProvider>
						</Suspense>
					</SidebarInset>
				</SidebarProvider>
			</SettingsProvider>
		</OptimisticChatsProvider>
	)
}
