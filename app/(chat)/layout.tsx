import { cookies } from "next/headers"
import Script from "next/script"
import { Suspense } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { NoticeHandler } from "@/features/chat/components/notice-handler"
import { SidebarShell } from "@/features/sidebar/components/sidebar-shell"
import { SidebarSkeleton } from "@/features/sidebar/components/sidebar-skeleton"
import { getAppSession } from "@/lib/auth/session"
import { PendingChatsProvider } from "@/lib/providers/pending-chats-provider"

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
	// Pre-warm session for child server components (React.cache dedup).
	await getAppSession()

	const cookieStore = await cookies()
	const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

	return (
		<>
			<NoticeHandler />
			<Script src="/pyodide/pyodide.js" strategy="lazyOnload" />
			<PendingChatsProvider>
				<SidebarProvider defaultOpen={sidebarOpen}>
					<Suspense fallback={<SidebarSkeleton />}>
						<SidebarShell />
					</Suspense>
					<SidebarInset>{children}</SidebarInset>
				</SidebarProvider>
			</PendingChatsProvider>
		</>
	)
}
