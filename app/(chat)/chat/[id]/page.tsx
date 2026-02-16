/**
 * Chat by ID Page
 *
 * Dynamic route for viewing an existing chat conversation.
 * Loads chat messages from the database and displays the Chat component.
 *
 * @module app/(chat)/chat/[id]/page
 */

import { redirect } from "next/navigation"
import type { JSX } from "react"

import { Chat, type ModelMetadata } from "@/features/chat/components/chat"
import { DataStreamHandler } from "@/features/chat/components/data-stream-handler"
import type { AppUsage, ChatMessage, UserVote } from "@/features/chat/types"
import { getDefaultChatModel, listChatModels } from "@/lib/ai"
import { getSession } from "@/lib/auth/session"
import {
	type ChatWithMessages,
	chatService,
	type ServiceContext,
	voteRepository,
} from "@/lib/data"
import type { Message } from "@/lib/db/schema"
import { logError } from "@/lib/log"

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert database messages to UI messages format
 *
 * @param messages - Database messages
 * @returns UI messages for the Chat component
 */
function convertToUIMessages(messages: Message[]): ChatMessage[] {
	return messages.map((message) => {
		return {
			id: message.id,
			role: message.role as "user" | "assistant" | "system",
			parts: message.parts as ChatMessage["parts"],
			metadata: {
				createdAt: message.createdAt.toISOString(),
			},
		} satisfies ChatMessage
	})
}

// =============================================================================
// Chat Page Component
// =============================================================================

/**
 * Chat by ID page component.
 *
 * Loads an existing chat with messages and displays the Chat component.
 * Handles:
 * - Authentication check (supports guest sessions)
 * - Chat ownership verification
 * - Message loading
 * - Vote loading
 *
 * @param props - Component props
 * @param props.params - Route parameters containing chat ID
 * @returns The chat page
 */
export default async function ChatPage({
	params,
}: {
	params: Promise<{ id: string }>
}): Promise<JSX.Element> {
	const { id } = await params

	// Get session (supports both authenticated and guest users)
	const session = await getSession()

	// Redirect to home if no session exists
	if (!session?.user) {
		redirect("/")
	}

	// Create service context
	const ctx: ServiceContext = {
		userId: session.user.id,
		isGuest: session.user.type === "guest",
	}

	// Fetch chat with messages
	let result: ChatWithMessages | null = null
	try {
		result = await chatService.getWithMessages(id, ctx)
	} catch (error) {
		logError("chat_page_load_failed", error as Error, { chatId: id })
		redirect("/?notice=chat_not_found")
	}

	// Handle chat not found
	if (!result) {
		redirect("/?notice=chat_not_found")
	}

	const { chat: chatData, messages: messagesFromDb } = result

	// Check visibility permissions
	if (
		chatData.visibility === "private" &&
		session.user.id !== chatData.userId
	) {
		logError("chat_access_denied", undefined, {
			chatId: id,
			visibility: chatData.visibility,
			requestingUserId: session.user.id,
			ownerUserId: chatData.userId,
		})
		redirect("/?notice=chat_not_found")
	}

	// Convert messages to UI format
	const uiMessages = convertToUIMessages(messagesFromDb)

	// Get available models
	const availableModels = listChatModels()

	// Get initial model from chat context or default
	const defaultModel = getDefaultChatModel()
	const defaultModelId =
		defaultModel?.id ?? availableModels[0]?.id ?? "openai:gpt-4o"
	const initialChatModel =
		(chatData.lastContext as { modelId?: string } | null)?.modelId ??
		defaultModelId

	// Fetch votes for the chat (only for non-guest users with messages)
	let votes: UserVote[] = []
	try {
		if (messagesFromDb.length >= 2 && session.user.type !== "guest") {
			const dbVotes = await voteRepository.findByChatId(id, ctx)
			votes = dbVotes.map((v) => ({
				chatId: v.chatId,
				messageId: v.messageId,
				isUpvoted: v.isUpvoted,
			}))
		}
	} catch (error) {
		logError("votes_fetch_failed", error as Error, { chatId: id })
		// Continue without votes
	}

	// Transform models to the format expected by Chat component
	const modelMetadata: ModelMetadata[] = availableModels.map((model) => ({
		id: model.id,
		name: model.name,
		providerId: model.provider,
		providerName: model.provider,
	}))

	// Determine if user can edit (owner only)
	const isReadonly = session.user.id !== chatData.userId

	// Prepare initialLastContext if available
	const lastContext = chatData.lastContext as AppUsage | null

	// Build chat props conditionally to handle optional initialLastContext
	const chatProps = {
		availableModels: modelMetadata,
		id: chatData.id,
		initialChatModel,
		initialMessages: uiMessages,
		initialVisibilityType: chatData.visibility,
		initialVotes: votes,
		isReadonly,
		...(lastContext && { initialLastContext: lastContext }),
	}

	return (
		<>
			<Chat {...chatProps} />
			<DataStreamHandler />
		</>
	)
}
