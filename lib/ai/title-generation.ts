import { generateText, type UIMessage } from "ai";
import { DEFAULT_TITLE_MODEL } from "@/lib/ai/models";
import { myProvider } from "@/lib/ai/providers";
import { isTestEnvironment } from "@/lib/constants";

/**
 * Generate a chat title from the user's first message
 * @param message - The first user message
 * @returns A short title (max 80 chars)
 */
export async function generateTitleFromUserMessage({
    message,
}: {
    message: UIMessage;
}): Promise<string> {
    try {
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

        return title || "New Chat";
    } catch {
        // Fallback to extracting first part of message text if title generation fails
        const textPart = message.parts?.find(
            (p): p is { type: "text"; text: string } =>
                p.type === "text" &&
                typeof (p as { text?: string }).text === "string"
        );
        const fallbackTitle = textPart?.text?.slice(0, 80).trim() || "New Chat";
        return fallbackTitle;
    }
}

/**
 * Generate a placeholder title from message content synchronously
 * Used as immediate title while async generation happens
 */
export function generatePlaceholderTitle(message: UIMessage): string {
    try {
        const parts = message.parts as Array<{ type: string; text?: string }>;
        const textPart = parts?.find(
            (p): p is { type: "text"; text: string } =>
                p?.type === "text" && typeof p.text === "string"
        );
        const base = (textPart?.text || "").trim();
        const trimmed = base.length > 0 ? base.slice(0, 80) : "New Chat";
        return trimmed;
    } catch {
        return "New Chat";
    }
}
