/**
 * New Chat Page
 *
 * Page for starting a new chat conversation.
 * Displays the Chat component with empty initial messages.
 *
 * @module app/(chat)/page
 */

import { cookies } from "next/headers"
import type { JSX } from "react"

import { Chat, type ModelMetadata } from "@/features/chat/components/chat"
import { DataStreamHandler } from "@/features/chat/components/data-stream-handler"
import { getDefaultChatModel, listChatModels } from "@/lib/ai"

// =============================================================================
// New Chat Page Component
// =============================================================================

/**
 * New chat page component.
 *
 * Creates a new chat session with:
 * - Empty initial messages
 * - Model selection from cookie or default
 * - Private visibility by default
 * - Data stream handler for real-time updates
 *
 * @returns The new chat page
 */
export default async function NewChatPage(): Promise<JSX.Element> {
	// Get available models
	const availableModels = listChatModels()

	// Get selected model from cookie or use default
	const cookieStore = await cookies()
	const selectedModelId = cookieStore.get("chat-model")?.value

	// Get default model
	const defaultModel = getDefaultChatModel()
	const defaultModelId =
		defaultModel?.id ?? availableModels[0]?.id ?? "openai:gpt-4o"

	const initialChatModel =
		selectedModelId &&
		availableModels.some((model) => model.id === selectedModelId)
			? selectedModelId
			: defaultModelId

	// Generate a new chat ID using crypto.randomUUID
	const id = crypto.randomUUID()

	// Transform models to the format expected by Chat component
	const modelMetadata: ModelMetadata[] = availableModels.map((model) => ({
		id: model.id,
		name: model.name,
		providerId: model.provider,
		providerName: model.provider, // Use provider as name for now
	}))

	return (
		<>
			<Chat
				availableModels={modelMetadata}
				id={id}
				initialChatModel={initialChatModel}
				initialMessages={[]}
				initialVisibilityType="private"
				initialVotes={[]}
				isReadonly={false}
				key={id}
			/>
			<DataStreamHandler />
		</>
	)
}
