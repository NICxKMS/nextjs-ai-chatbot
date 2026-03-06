import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ChatShell } from "@/features/chat/components/chat-shell"
import { ChatStreamProvider } from "@/features/chat/components/chat-stream-provider"
import { convertToUIMessages } from "@/features/chat/lib/message-utils"
import { getAvailableModels } from "@/features/models/lib/models"
import { VoteResolver, VotesProvider } from "@/features/voting/components/vote-resolver"
import { getAppSession } from "@/lib/auth/session"
import { cacheKeys } from "@/lib/cache/keys"
import { withCache } from "@/lib/cache/with-cache"
import { getChatById } from "@/lib/data/chat"
import { getMessagesByChatId } from "@/lib/data/message"
import { getVotesByChatId } from "@/lib/data/vote"
import { DEFAULT_CHAT_MODEL } from "@/lib/types/model.types"

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

async function getChatPageState(chatId: string) {
	const [session, chat] = await Promise.all([getAppSession(), getCachedChat(chatId)])

	return {
		session,
		chat: getVisibleChat(chat, session),
	}
}

function getVotesPromise(chatId: string, session: Awaited<ReturnType<typeof getAppSession>>) {
	if (!session?.user || session.user.type === "guest") {
		return Promise.resolve([] as Awaited<ReturnType<typeof getCachedVotes>>)
	}

	return getCachedVotes(chatId, session.user.id).catch((error: unknown) => {
		console.error("[VoteResolver] Failed to fetch votes:", error)
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
	return { title: chat?.title ?? "Chat" }
}

// ── Page ─────────────────────────────────────────────────────

export default async function ExistingChatPage({ params }: { params: Promise<{ id: string }> }) {
	const { id: chatId } = await params
	const chatPageStatePromise = getChatPageState(chatId)
	const availableModelsPromise = getAvailableModels()
	const { session, chat } = await chatPageStatePromise

	if (!chat) notFound()

	const votesPromise = getVotesPromise(chatId, session)

	// Fetch messages + models in parallel after access control passes
	const [dbMessages, availableModels] = await Promise.all([
		getMessagesByChatId(chatId),
		availableModelsPromise,
	])

	const initialMessages = convertToUIMessages(dbMessages)

	const isReadonly = !session?.user || session.user.id !== chat.userId

	return (
		<ChatStreamProvider>
			<VotesProvider chatId={chat.id}>
				<ChatShell
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
		</ChatStreamProvider>
	)
}
