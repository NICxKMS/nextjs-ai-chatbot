"use server";

import type { UIMessage } from "ai";
import type { VisibilityType } from "@/components/visibility-selector";
import { generateTitleFromUserMessage as generateTitle } from "@/lib/ai/title-generation";
import { getAppSession } from "@/lib/auth/session";
import { createContext } from "@/lib/data/base";
import { chatData, messageData } from "@/lib/data/chat";

export async function generateTitleFromUserMessage({
    message,
}: {
    message: UIMessage;
}): Promise<string> {
    return await generateTitle({ message });
}

export async function deleteTrailingMessages({
    chatId,
    createdAt,
}: {
    chatId: string;
    createdAt: string;
}) {
    const session = await getAppSession();
    if (!session?.user) {
        return;
    }

    const ctx = createContext(session);

    await messageData.deleteAfterTimestamp(chatId, new Date(createdAt), ctx);
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
