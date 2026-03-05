import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Suspense } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
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

// ── Chat layout shell (async, accesses cookies → must be inside Suspense) ──

async function ChatLayoutShell({ children }: { children: React.ReactNode }) {
	// Pre-warm session for child server components (React.cache dedup).
	await getAppSession()

	const cookieStore = await cookies()
	const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

	return (
		<SidebarProvider defaultOpen={sidebarOpen}>
			<Suspense fallback={<SidebarSkeleton />}>
				<SidebarShell />
			</Suspense>
			<SidebarInset>{children}</SidebarInset>
		</SidebarProvider>
	)
}

// ── Chat layout ────────────────────────────────────────────────
// With cacheComponents enabled, dynamic APIs (cookies/headers) must be
// accessed inside <Suspense> boundaries. NoticeHandler and
// PendingChatsProvider are client components that don't use server-side
// dynamic APIs, so they remain outside Suspense.

export default function ChatLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<NoticeHandler />
			<PendingChatsProvider>
				<Suspense fallback={<SidebarSkeleton />}>
					<ChatLayoutShell>{children}</ChatLayoutShell>
				</Suspense>
			</PendingChatsProvider>
		</>
	)
}
