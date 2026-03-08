import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { Suspense } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar-provider"
import { SessionProvider } from "@/features/auth/components/session-provider"
import { NoticeHandler } from "@/features/chat/components/notice-handler"
import { SidebarShell } from "@/features/sidebar/components/sidebar-shell"
import { SidebarSkeleton } from "@/features/sidebar/components/sidebar-skeleton"
import { getAppSession } from "@/lib/auth/session"
import { PendingChatsProvider } from "@/lib/providers/pending-chats-provider"

export const metadata: Metadata = {
	title: {
		template: "%s | ai-assistant",
		default: "ai-assistant",
	},
}

async function getSidebarDefaultOpen() {
	const cookieStore = await cookies()
	return cookieStore.get("sidebar_state")?.value !== "false"
}

// ── Chat layout ────────────────────────────────────────────────
// The layout reads the sidebar cookie directly (essentially free — cookies are
// request-local data in Next.js). This avoids nesting an async component inside
// a Suspense boundary that would show a redundant skeleton before the real
// SidebarShell Suspense even triggers — eliminating the double-skeleton flash.
//
// Only SidebarShell (which fetches session + cached chat history) is wrapped in
// Suspense. Children render immediately alongside the skeleton fallback so page
// content is never blanked during sidebar loading.

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
	const sessionPromise = getAppSession()
	const [defaultOpen, headersList] = await Promise.all([getSidebarDefaultOpen(), headers()])
	const initialIsMobile = headersList.get("x-device-type") === "mobile"

	return (
		<>
			<Suspense fallback={null}>
				<NoticeHandler />
			</Suspense>
			<SessionProvider session={sessionPromise}>
				<PendingChatsProvider>
					<SidebarProvider defaultOpen={defaultOpen} initialIsMobile={initialIsMobile}>
						<Suspense fallback={<SidebarSkeleton />}>
							<SidebarShell />
						</Suspense>
						<SidebarInset id="main-content">{children}</SidebarInset>
					</SidebarProvider>
				</PendingChatsProvider>
			</SessionProvider>
		</>
	)
}
