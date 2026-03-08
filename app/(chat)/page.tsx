import type { Metadata } from "next"
import { ChatShell } from "@/features/chat/components/chat-shell"
import { getAvailableModels, getDefaultModel } from "@/features/models/lib/models"
import { generateUUID } from "@/lib/utils/generate-uuid"

export const metadata: Metadata = {
	title: "New Chat",
	description: "Start a new conversation with the AI assistant.",
	openGraph: {
		title: "New Chat",
		description: "Start a new conversation with the AI assistant.",
	},
}

export default async function NewChatPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string; query?: string }>
}) {
	const availableModelsPromise = getAvailableModels()

	const [params, availableModels, defaultModel] = await Promise.all([
		searchParams,
		availableModelsPromise,
		getDefaultModel(null, availableModelsPromise),
	])
	const initialQuery = params.q || params.query || undefined

	const id = generateUUID()

	return (
		<ChatShell
			key={id}
			id={id}
			initialMessages={[]}
			initialChatModel={defaultModel}
			isReadonly={false}
			initialVisibility="private"
			availableModels={availableModels}
			initialQuery={initialQuery}
		/>
	)
}
