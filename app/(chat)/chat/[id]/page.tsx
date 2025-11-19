import { redirect } from "next/navigation";

import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { listChatModels } from "@/lib/ai/model-registry";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getAppSession } from "@/lib/auth/session";
import { type ChatWithMessages, createContext } from "@/lib/data/base";
import { chatData } from "@/lib/data/chat";
import { getVotesByChatIdAndUserId } from "@/lib/db/queries";
import type { Vote } from "@/lib/db/schema";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const { id } = params;
	const session = await getAppSession();

	if (!session?.user) {
		redirect("/?notice=chat_not_found");
	}

	const ctx = createContext(session);

	// Fetch chat with messages in a single optimized cache operation
	// Guest users: cache-only (no database fallback)
	// Authenticated users: cache first, then database fallback
	let result: ChatWithMessages | null;
	try {
		result = await chatData.getWithMessages(id, ctx);
	} catch (_error) {
		// Database error - redirect to home with error notice
		redirect("/?notice=chat_not_found");
	}

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

	// Fetch votes server-side to avoid client-side cache GET
	let votes: Vote[] = [];
	try {
		votes =
			messagesFromDb.length >= 2 && session.user.type !== "guest"
				? await getVotesByChatIdAndUserId({
						chatId: id,
						userId: session.user.id,
					})
				: [];
	} catch (_error) {
		// Database error fetching votes - continue without votes
		votes = [];
	}

	const uiVotes = votes.map((v) => ({
		chatId: v.chatId,
		messageId: v.messageId,
		isUpvoted: v.isUpvoted,
	}));

	return (
		<>
			<Chat
				availableModels={availableModels}
				id={chat.id}
				initialChatModel={initialChatModel}
				initialLastContext={chat.lastContext ?? undefined}
				initialMessages={uiMessages}
				initialVisibilityType={chat.visibility}
				initialVotes={uiVotes}
				isReadonly={session?.user?.id !== chat.userId}
			/>
			<DataStreamHandler />
		</>
	);
}
