import { redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { listChatModels } from "@/lib/ai/model-registry";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { createContext } from "@/lib/data/base";
import { chatData } from "@/lib/data/chat";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const { id } = params;
	const session = await auth();

	if (!session) {
		redirect(
			`/api/auth/guest?redirectUrl=${encodeURIComponent(`/chat/${id}`)}`
		);
	}

	const ctx = createContext(session);

	// Fetch chat with messages in a single optimized cache operation
	// Guest users: cache-only (no database fallback)
	// Authenticated users: cache first, then database fallback
	const result = await chatData.getWithMessages(id, ctx);

	if (!result) {
		redirect("/?notice=chat_not_found");
	}

	const { chat, messages: messagesFromDb } = result;

	if (chat.visibility === "private") {
		if (!session.user) {
			return redirect("/?notice=chat_not_found");
		}

		if (session.user.id !== chat.userId) {
			return redirect("/?notice=chat_not_found");
		}
	}

	const uiMessages = convertToUIMessages(messagesFromDb);
	const availableModels = listChatModels();

	const initialChatModel = chat.lastContext?.modelId || DEFAULT_CHAT_MODEL;

	return (
		<>
			<Chat
				autoResume={true}
				availableModels={availableModels}
				id={chat.id}
				initialChatModel={initialChatModel}
				initialLastContext={chat.lastContext ?? undefined}
				initialMessages={uiMessages}
				initialVisibilityType={chat.visibility}
				isReadonly={session?.user?.id !== chat.userId}
			/>
			<DataStreamHandler />
		</>
	);
}
