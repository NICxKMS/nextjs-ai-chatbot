import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { listChatModels } from "@/lib/ai/model-registry";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { isBlobStorageConfigured } from "@/lib/constants";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const { id } = params;

	const [chat, session] = await Promise.all([getChatById({ id }), auth()]);

	if (!chat) {
		notFound();
	}

	if (!session) {
		redirect("/api/auth/guest");
	}

	if (chat.visibility === "private") {
		if (!session.user) {
			return notFound();
		}

		if (session.user.id !== chat.userId) {
			return notFound();
		}
	}

	const [messagesFromDb, cookieStore] = await Promise.all([
		getMessagesByChatId({
			id,
		}),
		cookies(),
	]);

	const uiMessages = convertToUIMessages(messagesFromDb);
	const availableModels = listChatModels();
	const chatModelFromCookie = cookieStore.get("chat-model");

	if (!chatModelFromCookie) {
		return (
			<DataStreamProvider>
				<Chat
					autoResume={true}
					availableModels={availableModels}
					id={chat.id}
					initialChatModel={DEFAULT_CHAT_MODEL}
					initialLastContext={chat.lastContext ?? undefined}
					initialMessages={uiMessages}
					initialVisibilityType={chat.visibility}
					isReadonly={session?.user?.id !== chat.userId}
					uploadsEnabled={isBlobStorageConfigured}
				/>
				<DataStreamHandler />
			</DataStreamProvider>
		);
	}

	return (
		<DataStreamProvider>
			<Chat
				autoResume={true}
				availableModels={availableModels}
				id={chat.id}
				initialChatModel={chatModelFromCookie.value}
				initialLastContext={chat.lastContext ?? undefined}
				initialMessages={uiMessages}
				initialVisibilityType={chat.visibility}
				isReadonly={session?.user?.id !== chat.userId}
				uploadsEnabled={isBlobStorageConfigured}
			/>
			<DataStreamHandler />
		</DataStreamProvider>
	);
}
