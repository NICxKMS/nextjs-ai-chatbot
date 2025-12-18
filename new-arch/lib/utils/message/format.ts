import type { Message, MessagePart } from "../../types/domain";
import { getMessageText, getToolCalls } from "./parts";

/**
 * Formats a message for display, handling different content types.
 *
 * @param message - The message to format
 * @returns Formatted display string
 *
 * @example
 * const display = formatMessage(message);
 */
export function formatMessage(message: Message): string {
    const text = getMessageText(message);

    if (text) {
        return text;
    }

    // If no text, check for tool calls
    if (Array.isArray(message.parts)) {
        const toolCalls = getToolCalls(message.parts);
        if (toolCalls.length > 0) {
            return `[Tool: ${toolCalls.map((tc) => tc.toolName).join(", ")}]`;
        }
    }

    return "[Empty message]";
}

/**
 * Converts a message to Markdown format.
 *
 * @param message - The message to convert
 * @returns Markdown string representation
 *
 * @example
 * const md = messageToMarkdown(message);
 */
export function messageToMarkdown(message: Message): string {
    const lines: string[] = [];
    const role = message.role === "user" ? "User" : "Assistant";

    lines.push(`**${role}:**`);
    lines.push("");

    for (const part of message.parts) {
        switch (part.type) {
            case "text":
                lines.push(part.text);
                break;
            case "image":
                lines.push(`![Image](${part.url})`);
                break;
            case "file":
                lines.push(`📎 File: ${part.name || "attachment"}`);
                break;
            case "tool-call":
                lines.push("```tool-call");
                lines.push(`Tool: ${part.toolName}`);
                lines.push(`Args: ${JSON.stringify(part.args, null, 2)}`);
                lines.push("```");
                break;
            case "tool-result":
                lines.push("```tool-result");
                lines.push(
                    typeof part.result === "string"
                        ? part.result
                        : JSON.stringify(part.result, null, 2)
                );
                lines.push("```");
                break;
            case "reasoning":
                lines.push(`> ${part.text}`);
                break;
            case "code":
                lines.push(`\`\`\`${part.language || ""}`);
                lines.push(part.code);
                lines.push("```");
                break;
            case "source":
                if (part.title) {
                    lines.push(`[${part.title}](${part.url || "#"})`);
                }
                break;
            default:
                // Unknown part type, skip silently
                break;
        }
        lines.push("");
    }

    return lines.join("\n").trim();
}

/**
 * Formats a message list for export or display.
 *
 * @param messages - Array of messages to format
 * @returns Formatted conversation string
 *
 * @example
 * const conversation = formatConversation(messages);
 */
export function formatConversation(messages: Message[]): string {
    return messages.map(messageToMarkdown).join("\n\n---\n\n");
}

/**
 * Gets a preview/summary of a message (first N characters).
 *
 * @param message - The message to preview
 * @param maxLength - Maximum preview length (default: 100)
 * @returns Preview string
 *
 * @example
 * const preview = getMessagePreview(message, 50);
 */
export function getMessagePreview(message: Message, maxLength = 100): string {
    const text = getMessageText(message);
    if (!text) {
        return formatMessage(message);
    }

    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Counts parts by type in a message.
 *
 * @param parts - Array of message parts
 * @returns Object with counts per type
 *
 * @example
 * const counts = countPartTypes(message.parts);
 * // { text: 2, image: 1, 'tool-invocation': 1 }
 */
export function countPartTypes(parts: MessagePart[]): Record<string, number> {
    return parts.reduce(
        (acc, part) => {
            acc[part.type] = (acc[part.type] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
}
