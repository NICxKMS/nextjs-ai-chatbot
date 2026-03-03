import { cookies } from "next/headers"
import Script from "next/script"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { NoticeHandler } from "@/features/chat/components/notice-handler"
import { getAppSession } from "@/lib/auth/session"
import { PendingChatsProvider } from "@/lib/providers/pending-chats-provider"

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
	// Pre-warm session for child server components (React.cache dedup).
	// Session will be passed to SidebarShell when wired in P5-T11.
	await getAppSession()

	const cookieStore = await cookies()
	const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

	return (
		<>
			<NoticeHandler />
			<Script src="/pyodide/pyodide.js" strategy="lazyOnload" />
			<PendingChatsProvider>
				<SidebarProvider defaultOpen={sidebarOpen}>
					{/* P5-T11: <Suspense fallback={<SidebarSkeleton />}><SidebarShell /></Suspense> */}
					<SidebarInset>{children}</SidebarInset>
				</SidebarProvider>
			</PendingChatsProvider>
		</>
	)
}
