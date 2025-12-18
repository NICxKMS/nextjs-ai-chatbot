/**
 * Message Parts Types
 * @module lib/types/message-parts
 *
 * Type definitions for message content parts and attachments.
 * These types represent the structure of message content in the chat system.
 */

/**
 * Text content part within a message.
 */
export type TextPart = {
    type: "text";
    text: string;
};

/**
 * Image content part within a message.
 */
export type ImagePart = {
    type: "image";
    image: string; // URL or base64
    mimeType?: string;
};

/**
 * Tool call part within a message (for assistant messages).
 */
export type ToolCallPart = {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
};

/**
 * Tool result part within a message (for tool response messages).
 */
export type ToolResultPart = {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    result: unknown;
    isError?: boolean;
};

/**
 * Reasoning content part (for chain-of-thought).
 */
export type ReasoningPart = {
    type: "reasoning";
    reasoning: string;
};

/**
 * Union type of all message content parts.
 */
export type MessagePart =
    | TextPart
    | ImagePart
    | ToolCallPart
    | ToolResultPart
    | ReasoningPart;

/**
 * Message attachment (files, images, etc.).
 */
export type MessageAttachment = {
    name: string;
    url: string;
    contentType: string;
    size?: number;
};

// Type guards for message parts

export function isTextPart(part: MessagePart): part is TextPart {
    return part.type === "text";
}

export function isImagePart(part: MessagePart): part is ImagePart {
    return part.type === "image";
}

export function isToolCallPart(part: MessagePart): part is ToolCallPart {
    return part.type === "tool-call";
}

export function isToolResultPart(part: MessagePart): part is ToolResultPart {
    return part.type === "tool-result";
}

export function isReasoningPart(part: MessagePart): part is ReasoningPart {
    return part.type === "reasoning";
}

/**
 * Extract text content from message parts.
 */
export function extractTextFromParts(parts: MessagePart[]): string {
    return parts
        .filter(isTextPart)
        .map((p) => p.text)
        .join("\n");
}
