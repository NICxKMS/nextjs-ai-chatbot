"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { DEFAULT_TITLE_MODEL } from "@/lib/ai/models";
import { myProvider } from "@/lib/ai/providers";
import {
	deleteMessagesByChatIdAfterTimestamp,
	getMessageById,
	updateChatVisiblityById,
} from "@/lib/db/queries";

export async function saveChatModelAsCookie(model: string) {
	const cookieStore = await cookies();
	cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
	message,
}: {
	message: UIMessage;
}) {
	const serializedMessage = JSON.stringify(message);

	const cached = titleGenerationCache.get(serializedMessage);
	if (cached) {
		return cached;
	}

	const titleModel = (() => {
		try {
			return myProvider.languageModel("title-model");
		} catch (error) {
			console.warn("Falling back to default title model:", error);
			return myProvider.languageModel(DEFAULT_TITLE_MODEL);
		}
	})();

	const titlePromise = generateText({
		model: titleModel,
		system: `
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
		prompt: JSON.stringify(message),
	}).then(({ text }) => text);

	titleGenerationCache.set(serializedMessage, titlePromise);

	const title = await titlePromise;

	trimTitleCache();

	return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
	const [message] = await getMessageById({ id });

	await deleteMessagesByChatIdAfterTimestamp({
		chatId: message.chatId,
		timestamp: message.createdAt,
	});
}

export async function updateChatVisibility({
	chatId,
	visibility,
}: {
	chatId: string;
	visibility: VisibilityType;
}) {
	await updateChatVisiblityById({ chatId, visibility });
}

const titleGenerationCache = new Map<string, Promise<string>>();
const MAX_TITLE_CACHE_ENTRIES = 50;

function trimTitleCache() {
	if (titleGenerationCache.size <= MAX_TITLE_CACHE_ENTRIES) {
		return;
	}

	const keys = Array.from(titleGenerationCache.keys());
	for (const key of keys.slice(
		0,
		titleGenerationCache.size - MAX_TITLE_CACHE_ENTRIES
	)) {
		titleGenerationCache.delete(key);
	}
}
