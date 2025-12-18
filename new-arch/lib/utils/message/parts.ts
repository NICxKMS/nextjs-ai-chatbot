import type {
    Message,
    MessagePart,
    ToolCallPart,
    ToolResultPart,
} from "../../types/domain";

/**
 * Extracts all text content from message parts.
 *
 * @param parts - Array of message parts
 * @returns Combined text content
 *
 * @example
 * const text = extractTextFromParts(message.parts);
 */
export function extractTextFromParts(parts: MessagePart[]): string {
    return parts
        .filter(
            (part): part is MessagePart & { type: "text" } =>
                part.type === "text"
        )
        .map((part) => part.text)
        .join("\n");
}

/**
 * Extracts text content from a message, handling both string and parts format.
 *
 * @param message - The message to extract text from
 * @returns The text content of the message
 *
 * @example
 * const content = getMessageText(message);
 */
export function getMessageText(message: Message): string {
    return extractTextFromParts(message.parts);
}

/**
 * Gets all tool calls from message parts.
 *
 * @param parts - Array of message parts
 * @returns Array of tool call parts
 *
 * @example
 * const toolCalls = getToolCalls(message.parts);
 * toolCalls.forEach(tc => console.log(tc.toolName));
 */
export function getToolCalls(parts: MessagePart[]): ToolCallPart[] {
    return parts.filter(
        (part): part is ToolCallPart => part.type === "tool-call"
    );
}

/**
 * Gets all tool results from message parts.
 *
 * @param parts - Array of message parts
 * @returns Array of tool result parts
 *
 * @example
 * const results = getToolResults(message.parts);
 */
export function getToolResults(parts: MessagePart[]): ToolResultPart[] {
    return parts.filter(
        (part): part is ToolResultPart => part.type === "tool-result"
    );
}

/**
 * Checks if a message contains any tool calls.
 *
 * @param message - The message to check
 * @returns True if the message has tool calls
 *
 * @example
 * if (hasToolCalls(message)) { ... }
 */
export function hasToolCalls(message: Message): boolean {
    return (
        Array.isArray(message.parts) && getToolCalls(message.parts).length > 0
    );
}

/**
 * Checks if a message has text content.
 *
 * @param message - The message to check
 * @returns True if the message has text content
 *
 * @example
 * if (hasTextContent(message)) { ... }
 */
export function hasTextContent(message: Message): boolean {
    return getMessageText(message).trim().length > 0;
}

/**
 * Gets images from message parts.
 *
 * @param parts - Array of message parts
 * @returns Array of image parts
 *
 * @example
 * const images = getImages(message.parts);
 */
export function getImages(
    parts: MessagePart[]
): Array<MessagePart & { type: "image" }> {
    return parts.filter(
        (part): part is MessagePart & { type: "image" } => part.type === "image"
    );
}

/**
 * Gets files from message parts.
 *
 * @param parts - Array of message parts
 * @returns Array of file parts
 *
 * @example
 * const files = getFiles(message.parts);
 */
export function getFiles(
    parts: MessagePart[]
): Array<MessagePart & { type: "file" }> {
    return parts.filter(
        (part): part is MessagePart & { type: "file" } => part.type === "file"
    );
}
