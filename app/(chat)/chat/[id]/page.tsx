import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { listChatModels } from "@/lib/ai/model-registry";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const { id } = params;
	const session = await auth();

	if (!session) {
		redirect("/api/auth/guest");
	}

	// Pass userId to enable cache lookup for both guest and authenticated users
	const chat = await getChatById({ id, userId: session.user?.id });

	if (!chat) {
		notFound();
	}

	if (chat.visibility === "private") {
		if (!session.user) {
			return notFound();
		}

		if (session.user.id !== chat.userId) {
			return notFound();
		}
	}

	// Pass userId to enable cache lookup for messages
	const messagesFromDb = await getMessagesByChatId({
		id,
		userId: session.user?.id,
	});

	const uiMessages = convertToUIMessages(messagesFromDb);
	const availableModels = listChatModels();

	const initialChatModel =
		chat.lastContext?.modelId || DEFAULT_CHAT_MODEL;

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
