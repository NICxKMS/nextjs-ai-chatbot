import { cacheLife, cacheTag } from "next/cache"

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
} from "@/components/ui/sidebar"
import { SidebarHeaderActions } from "@/features/sidebar/components/sidebar-header-actions"
import { SidebarHistoryClient } from "@/features/sidebar/components/sidebar-history-client"
import { SidebarUserNav } from "@/features/sidebar/components/sidebar-user-nav"
import { getAppSession } from "@/lib/auth/session"
import { cacheKeys } from "@/lib/cache/keys"
import { getChatsByUserId } from "@/lib/data/chat"
import type { ChatSummary } from "@/lib/types/entity.types"
import { logger } from "@/lib/utils/logger"

// ── Cached data fetcher ────────────────────────────────────────

/**
 * Fetch initial chat history with short-lived cache.
 *
 * Session (cookies) is read outside this scope by the caller.
 * The userId argument becomes part of the cache key, ensuring
 * per-user cache entries. `cacheTag` enables on-demand invalidation
 * when chats are created, renamed, or deleted.
 */
async function getCachedChats(userId: string): Promise<{ chats: ChatSummary[]; hasMore: boolean }> {
	"use cache"
	cacheLife("seconds")
	cacheTag(cacheKeys.chats(userId))

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

	let initialChats: ChatSummary[] = []
	let initialHasMore = false

	if (user) {
		try {
			const { chats, hasMore } = await getCachedChats(user.id)
			initialChats = chats
			initialHasMore = hasMore
		} catch (error) {
			logger.error("[SidebarShell] Failed to load initial chat history", { error })
		}
	}

	return (
		<Sidebar className="group-data-[side=left]:border-r-0">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarHeaderActions hasUser={!!user} />
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<nav aria-label="Chat history">
					<SidebarHistoryClient
						initialChats={initialChats}
						initialHasMore={initialHasMore}
					/>
				</nav>
			</SidebarContent>
			<SidebarFooter>
				<SidebarUserNav user={{ email: user?.email ?? null }} />
			</SidebarFooter>
		</Sidebar>
	)
}
