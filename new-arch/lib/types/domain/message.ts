/**
 * Message Domain Types
 * @module lib/types/domain/message
 *
 * Type definitions for message-related entities.
 */

// =============================================================================
// MESSAGE ROLE
// =============================================================================

/**
 * Valid message roles in the chat system
 */
export type MessageRole = "user" | "assistant" | "system" | "tool";

// =============================================================================
// MESSAGE PARTS
// =============================================================================

/**
 * Text content part
 */
export type TextPart = {
    type: "text";
    text: string;
};

/**
 * Tool invocation part
 */
export type ToolCallPart = {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
};

/**
 * Tool execution result part
 */
export type ToolResultPart = {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    result: unknown;
    isError?: boolean;
};

/**
 * Reasoning/thinking part for chain-of-thought
 */
export type ReasoningPart = {
    type: "reasoning";
    text: string;
    isCollapsed?: boolean;
};

/**
 * File attachment part
 */
export type FilePart = {
    type: "file";
    url: string;
    name?: string;
    mediaType?: string;
    size?: number;
};

/**
 * Image content part
 */
export type ImagePart = {
    type: "image";
    url: string;
    alt?: string;
    width?: number;
    height?: number;
};

/**
 * Code block part
 */
export type CodePart = {
    type: "code";
    code: string;
    language?: string;
    filename?: string;
};

/**
 * Source/citation part for RAG
 */
export type SourcePart = {
    type: "source";
    url?: string;
    title?: string;
    content?: string;
    relevanceScore?: number;
};

/**
 * Union of all message part types
 */
export type MessagePart =
    | TextPart
    | ToolCallPart
    | ToolResultPart
    | ReasoningPart
    | FilePart
    | ImagePart
    | CodePart
    | SourcePart;

// =============================================================================
// ATTACHMENT
// =============================================================================

/**
 * File attachment metadata
 */
export type Attachment = {
    /** Attachment URL */
    url: string;
    /** Display name */
    name: string;
    /** MIME type */
    contentType: string;
    /** File size in bytes */
    size?: number;
};

// =============================================================================
// MESSAGE
// =============================================================================

/**
 * Core message entity
 */
export type Message = {
    /** Unique message identifier (UUID) */
    id: string;
    /** Parent chat ID */
    chatId: string;
    /** Message role */
    role: MessageRole;
    /** Structured message parts */
    parts: MessagePart[];
    /** File attachments */
    attachments: Attachment[];
    /** Creation timestamp */
    createdAt: Date;
};

/**
 * Message with computed content string
 */
export type MessageWithContent = Message & {
    /** Computed text content from parts */
    content: string;
};

/**
 * Chat message for UI usage (simplified version)
 */
export type ChatMessage = {
    /** Unique message identifier (UUID) */
    id: string;
    /** Message role */
    role: "user" | "assistant" | "system";
    /** Text content */
    content: string;
    /** File attachments */
    attachments?: Attachment[];
    /** Creation timestamp */
    createdAt?: Date;
};

/**
 * Custom UI data types for data stream
 */
export type CustomUIDataTypes = {
    title?: string;
    append?: ChatMessage;
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };
};

/**
 * User vote on a message
 */
export type UserVote = {
    messageId: string;
    value: "up" | "down";
};

// Type guard for data stream append message part
export function isDataAppendMessagePart(
    data: unknown
): data is { type: "data-append"; message: ChatMessage } {
    return (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        (data as { type: string }).type === "data-append" &&
        "message" in data
    );
}

// Type guard for data stream chat title part
export function isDataChatTitlePart(
    data: unknown
): data is { type: "data-title"; title: string } {
    return (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        (data as { type: string }).type === "data-title" &&
        "title" in data
    );
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for text parts
 */
export function isTextPart(part: MessagePart): part is TextPart {
    return part.type === "text";
}

/**
 * Type guard for tool call parts
 */
export function isToolCallPart(part: MessagePart): part is ToolCallPart {
    return part.type === "tool-call";
}

/**
 * Type guard for tool result parts
 */
export function isToolResultPart(part: MessagePart): part is ToolResultPart {
    return part.type === "tool-result";
}

/**
 * Type guard for reasoning parts
 */
export function isReasoningPart(part: MessagePart): part is ReasoningPart {
    return part.type === "reasoning";
}

/**
 * Type guard for file parts
 */
export function isFilePart(part: MessagePart): part is FilePart {
    return part.type === "file";
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Extract text content from message parts
 */
export function extractTextFromParts(parts: MessagePart[]): string {
    return parts
        .filter(isTextPart)
        .map((part) => part.text)
        .join("\n");
}
