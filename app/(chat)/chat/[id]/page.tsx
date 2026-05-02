import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache, Suspense } from "react"
import { ChatShell } from "@/features/chat/components/chat-shell"
import { convertToUIMessages } from "@/features/chat/lib/message-utils"
import { getAvailableModels } from "@/features/models/lib/models"
import { VoteResolver, VotesProvider } from "@/features/voting/components/vote-resolver"
import { getAppSession } from "@/lib/auth/session"
import { cacheKeys } from "@/lib/cache/keys"
import { withCache } from "@/lib/cache/with-cache"
import { getChatById } from "@/lib/data/chat"
import { getMessagesForChatRender } from "@/lib/data/message"
import { getVotesByChatId } from "@/lib/data/vote"
import { DEFAULT_CHAT_MODEL } from "@/lib/types/model.types"
import { logger } from "@/lib/utils/logger"

/**
 * Initial message limit for the chat page render.
 * Keeps the first paint fast while still showing ample recent history.
 * The full safety cap (500) is used by the chat route handler for AI context.
 */
const INITIAL_MESSAGE_LIMIT = 150

// ── Cached data fetchers ─────────────────────────────────────
// `'use cache'` + `cacheTag` + `cacheLife('seconds')` per spec.
// These are page-level cached wrappers around pure DB functions.

async function getCachedChat(chatId: string) {
	"use cache"
	return withCache(cacheKeys.chat(chatId), () => getChatById(chatId), "seconds")
}

async function getCachedVotes(chatId: string, userId: string) {
	"use cache"
	return withCache(cacheKeys.votes(chatId), () => getVotesByChatId(chatId, userId), "seconds")
}

function getVisibleChat(
	chat: Awaited<ReturnType<typeof getCachedChat>>,
	session: Awaited<ReturnType<typeof getAppSession>>,
) {
	if (!chat) {
		return null
	}

	if (chat.visibility === "private" && session?.user?.id !== chat.userId) {
		return null
	}

	return chat
}

const getChatPageState = cache(async (chatId: string) => {
	const [session, chat] = await Promise.all([getAppSession(), getCachedChat(chatId)])

	return {
		session,
		chat: getVisibleChat(chat, session),
	}
})

function getVotesPromise(chatId: string, session: Awaited<ReturnType<typeof getAppSession>>) {
	if (!session?.user || session.user.type === "guest") {
		return Promise.resolve([] as Awaited<ReturnType<typeof getCachedVotes>>)
	}

	return getCachedVotes(chatId, session.user.id).catch((error: unknown) => {
		logger.error("[VoteResolver] Failed to fetch votes", { error: String(error) })
		return [] as Awaited<ReturnType<typeof getCachedVotes>>
	})
}

// ── Metadata ─────────────────────────────────────────────────

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>
}): Promise<Metadata> {
	const { id } = await params
	const { chat } = await getChatPageState(id)

	const title = chat?.title ?? "Chat"
	const description = chat ? `AI conversation: ${chat.title}` : "AI assistant chat conversation."

	return {
		title,
		description,
		...(chat && {
			openGraph: {
				title: chat.title,
				description: `AI conversation: ${chat.title}`,
			},
		}),
	}
}

// ── Page ─────────────────────────────────────────────────────

export default async function ExistingChatPage({ params }: { params: Promise<{ id: string }> }) {
	const { id: chatId } = await params

	// Start all independent fetches at time-0 in parallel.
	// Messages are fetched speculatively — if the user doesn't own the chat,
	// we discard the result (the access-control check in getChatPageState handles this).
	// This eliminates the waterfall: messages no longer wait behind access control.
	const [{ session, chat }, dbMessages, availableModels] = await Promise.all([
		getChatPageState(chatId),
		getMessagesForChatRender(chatId, INITIAL_MESSAGE_LIMIT),
		getAvailableModels(),
	])

	if (!chat) notFound()

	const votesPromise = getVotesPromise(chatId, session)
	const initialMessages = convertToUIMessages(dbMessages)

	const isReadonly = !session?.user || session.user.id !== chat.userId

	return (
		<VotesProvider chatId={chat.id}>
			<ChatShell
				key={chat.id}
				id={chat.id}
				initialMessages={initialMessages}
				initialChatModel={chat.model ?? DEFAULT_CHAT_MODEL}
				isReadonly={isReadonly}
				initialVisibility={chat.visibility}
				availableModels={availableModels}
			/>
			<Suspense fallback={null}>
				<VoteResolver votesPromise={votesPromise} />
			</Suspense>
		</VotesProvider>
	)
}
