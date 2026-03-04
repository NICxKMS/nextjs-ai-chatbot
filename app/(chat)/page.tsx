import type { Metadata } from "next"
import { ChatShell } from "@/features/chat/components/chat-shell"
import { ChatStreamProvider } from "@/features/chat/components/chat-stream-provider"
import { getAvailableModels, getDefaultModel } from "@/features/models/lib/models"
import { getAppSession } from "@/lib/auth/session"
import { generateUUID } from "@/lib/utils/generate-uuid"

export const metadata: Metadata = {
	title: "New Chat",
}

export default async function NewChatPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string; query?: string }>
}) {
	const [session, params] = await Promise.all([getAppSession(), searchParams])
	const initialQuery = params.q || params.query || undefined

	const [availableModels, defaultModel] = await Promise.all([
		getAvailableModels(),
		getDefaultModel(session),
	])

	const id = generateUUID()

	return (
		<ChatStreamProvider>
			<ChatShell
				id={id}
				initialMessages={[]}
				initialChatModel={defaultModel}
				isReadonly={false}
				initialVisibility="private"
				availableModels={availableModels}
				initialQuery={initialQuery}
			/>
		</ChatStreamProvider>
	)
}
