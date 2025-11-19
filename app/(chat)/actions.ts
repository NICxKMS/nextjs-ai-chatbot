"use server";

import { generateText, type UIMessage } from "ai";
// import { cookies } from "next/headers";
import { getAppSession } from "@/lib/auth/session";
import type { VisibilityType } from "@/components/visibility-selector";
import { DEFAULT_TITLE_MODEL } from "@/lib/ai/models";
import { myProvider } from "@/lib/ai/providers";
import { isTestEnvironment } from "@/lib/constants";
import { createContext } from "@/lib/data/base";
import { chatData, messageData } from "@/lib/data/chat";
import { getMessageById } from "@/lib/db/queries";

// export async function saveChatModelAsCookie(model: string) {
// 	const cookieStore = await cookies();
// 	cookieStore.set("chat-model", model);
// }

export async function generateTitleFromUserMessage({
	message,
}: {
	message: UIMessage;
}) {
	const titleModel = isTestEnvironment
		? myProvider.languageModel("title-model")
		: myProvider.languageModel(DEFAULT_TITLE_MODEL);

	const { text: title } = await generateText({
		model: titleModel,
		system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
		prompt: JSON.stringify(message),
	});

	return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
	const session = await getAppSession();
	if (!session?.user) {
		return;
	}

	const [message] = await getMessageById({ id });
	if (!message) {
		return;
	}

	const ctx = createContext(session);

	await messageData.deleteAfterTimestamp(
		message.chatId,
		message.createdAt,
		ctx
	);
}

export async function updateChatVisibility({
	chatId,
	visibility,
}: {
	chatId: string;
	visibility: VisibilityType;
}) {
	const session = await getAppSession();
	if (!session?.user) {
		return;
	}

	const ctx = createContext(session);
	await chatData.updateVisibility(chatId, visibility, ctx);
}
