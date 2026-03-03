import type { UIMessage } from "ai"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ChatShell } from "@/features/chat/components/chat-shell"
import { ChatStreamProvider } from "@/features/chat/components/chat-stream-provider"
import { getAvailableModels } from "@/features/models/lib/models"
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

// ── Metadata ─────────────────────────────────────────────────

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>
}): Promise<Metadata> {
	const { id } = await params
	const chat = await getCachedChat(id)
	return { title: chat?.title ?? "Chat" }
}

// ── Page ─────────────────────────────────────────────────────

export default async function ExistingChatPage({ params }: { params: Promise<{ id: string }> }) {
	const { id: chatId } = await params
	const session = await getAppSession()

	// Start votes promise in parallel (non-blocking) — consumed by VoteResolver in P6.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _votesPromise =
		session?.user && session.user.type !== "guest"
			? getCachedVotes(chatId, session.user.id)
			: Promise.resolve([])

	// Await chat separately for access control
	const chat = await getCachedChat(chatId)
	if (!chat) notFound()

	// Private chats: only the owner can view
	if (chat.visibility === "private" && session?.user?.id !== chat.userId) {
		notFound()
	}

	// Fetch messages + models in parallel after access control passes
	const [dbMessages, availableModels] = await Promise.all([
		getMessagesByChatId(chatId),
		getAvailableModels(),
	])

	// Convert DB messages to UIMessage format (id + role + parts)
	const initialMessages: UIMessage[] = dbMessages.map((msg) => ({
		id: msg.id,
		role: msg.role as UIMessage["role"],
		parts: msg.parts as UIMessage["parts"],
	}))

	const isReadonly = !session?.user || session.user.id !== chat.userId

	return (
		<ChatStreamProvider>
			{/* P6: VotesProvider wraps ChatShell; VoteResolver in Suspense consumes votesPromise */}
			<ChatShell
				id={chat.id}
				initialMessages={initialMessages}
				initialChatModel={chat.model ?? DEFAULT_CHAT_MODEL}
				isReadonly={isReadonly}
				initialVisibility={chat.visibility}
				availableModels={availableModels}
			/>
		</ChatStreamProvider>
	)
}
