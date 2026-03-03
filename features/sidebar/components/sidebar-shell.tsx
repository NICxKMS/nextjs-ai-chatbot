import { cacheLife, cacheTag } from "next/cache"
import Link from "next/link"

import { PlusIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SidebarHistoryClient } from "@/features/sidebar/components/sidebar-history-client"
import { SidebarUserNav } from "@/features/sidebar/components/sidebar-user-nav"
import { getAppSession } from "@/lib/auth/session"
import { getChatsByUserId } from "@/lib/data/chat"
import type { Chat } from "@/lib/types/models.types"

// ── Cached data fetcher ────────────────────────────────────────

/**
 * Fetch initial chat history with short-lived cache.
 *
 * Session (cookies) is read outside this scope by the caller.
 * The userId argument becomes part of the cache key, ensuring
 * per-user cache entries. `cacheTag` enables on-demand invalidation
 * when chats are created, renamed, or deleted.
 */
async function getCachedChats(userId: string): Promise<{ chats: Chat[]; hasMore: boolean }> {
	"use cache"
	cacheLife("seconds")
	cacheTag(`chats:${userId}`)

	const result = await getChatsByUserId(userId, { limit: 20 })
	return { chats: result.chats, hasMore: result.hasMore }
}

// ── Component ──────────────────────────────────────────────────

/**
 * Server-rendered sidebar shell.
 *
 * Fetches initial chat history server-side with `'use cache'` + `cacheTag`
 * to eliminate the client waterfall. The first 20 chats are available on
 * initial render. SidebarHistoryClient handles pagination beyond the
 * initial dataset via `useSWRInfinite`.
 */
export async function SidebarShell() {
	const session = await getAppSession()
	const user = session?.user ?? null

	let initialChats: Chat[] = []
	let initialHasMore = false

	if (user) {
		const { chats, hasMore } = await getCachedChats(user.id)
		initialChats = chats
		initialHasMore = hasMore
	}

	return (
		<>
			<SidebarHeader>
				<SidebarMenu>
					<div className="flex flex-row items-center justify-between">
						<Link className="flex flex-row items-center gap-3" href="/">
							<span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
								Assistant
							</span>
						</Link>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button asChild className="h-8 p-1 md:h-fit md:p-2" variant="ghost">
									<Link href="/">
										<PlusIcon />
									</Link>
								</Button>
							</TooltipTrigger>
							<TooltipContent align="end" className="hidden md:block">
								New Chat
							</TooltipContent>
						</Tooltip>
					</div>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarHistoryClient initialChats={initialChats} initialHasMore={initialHasMore} />
			</SidebarContent>
			<SidebarFooter>
				<SidebarUserNav user={{ email: user?.email ?? null }} />
			</SidebarFooter>
		</>
	)
}
