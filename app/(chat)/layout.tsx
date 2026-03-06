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

function ChatLayoutFrame({
	children,
	defaultOpen,
	sidebar,
}: {
	children: React.ReactNode
	defaultOpen: boolean
	sidebar: React.ReactNode
}) {
	return (
		<SidebarProvider defaultOpen={defaultOpen}>
			{sidebar}
			<SidebarInset>{children}</SidebarInset>
		</SidebarProvider>
	)
}

async function getSidebarDefaultOpen() {
	const cookieStore = await cookies()
	return cookieStore.get("sidebar_state")?.value !== "false"
}

// ── Chat layout shell (async runtime APIs) ───────────────────
// With cacheComponents enabled, cookies/session access must remain
// inside a Suspense boundary.

async function ChatLayoutShell({ children }: { children: React.ReactNode }) {
	// Pre-warm request-scoped session cache for child server components.
	await getAppSession()

	return (
		<ChatLayoutFrame
			defaultOpen={await getSidebarDefaultOpen()}
			sidebar={
				<Suspense fallback={<SidebarSkeleton />}>
					<SidebarShell />
				</Suspense>
			}
		>
			{children}
		</ChatLayoutFrame>
	)
}

// ── Fallback shell ───────────────────────────────────────────
// Preserve the chat pane while the async layout shell resolves so
// sidebar loading does not blank already-visible page content.

function ChatLayoutFallback({ children }: { children: React.ReactNode }) {
	return (
		<ChatLayoutFrame defaultOpen={true} sidebar={<SidebarSkeleton />}>
			{children}
		</ChatLayoutFrame>
	)
}

// ── Chat layout ────────────────────────────────────────────────
// NoticeHandler and PendingChatsProvider are client components without
// server runtime API reads, so they remain outside the Suspense boundary.

export default function ChatLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<NoticeHandler />
			<PendingChatsProvider>
				<Suspense fallback={<ChatLayoutFallback>{children}</ChatLayoutFallback>}>
					<ChatLayoutShell>{children}</ChatLayoutShell>
				</Suspense>
			</PendingChatsProvider>
		</>
	)
}
