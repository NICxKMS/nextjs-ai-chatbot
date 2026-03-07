import "react-data-grid/lib/styles.css"

import type { Metadata } from "next"
import { cookies } from "next/headers"
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
// Keep sidebar cookie reads behind the chat-local Suspense boundary while the
// session promise is started above and shared with the provider and pages.

async function ChatLayoutShell({ children }: { children: React.ReactNode }) {
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
// NoticeHandler and the session provider stay outside the sidebar Suspense
// boundary so the existing chat layout fallback remains intact while auth
// resolution and downstream page reads reuse the same request-cached promise.

export default function ChatLayout({ children }: { children: React.ReactNode }) {
	const sessionPromise = getAppSession()

	return (
		<>
			<Suspense fallback={null}>
				<NoticeHandler />
			</Suspense>
			<SessionProvider session={sessionPromise}>
				<PendingChatsProvider>
					<Suspense fallback={<ChatLayoutFallback>{children}</ChatLayoutFallback>}>
						<ChatLayoutShell>{children}</ChatLayoutShell>
					</Suspense>
				</PendingChatsProvider>
			</SessionProvider>
		</>
	)
}
