/**
 * Comprehensive Message Part Type System
 *
 * Provides type-safe definitions for all message part types used in the chat system.
 * This module serves as the single source of truth for message structure types.
 */

import type { ArtifactKind } from "@/components/artifact";

/**
 * Base interface for all message parts
 */
type BaseMessagePart = {
    type: string;
};

/**
 * Text content part - the most common message part
 */
export type TextPart = BaseMessagePart & {
    type: "text";
    text: string;
};

/**
 * File attachment part - images, documents, etc.
 */
export type FilePart = BaseMessagePart & {
    type: "file";
    url: string;
    name?: string;
    filename?: string; // Some systems use filename instead of name
    mediaType?: string;
    mimeType?: string; // Alias for mediaType
    size?: number;
};

/**
 * Reasoning/thinking part - chain of thought content
 */
export type ReasoningPart = BaseMessagePart & {
    type: "reasoning";
    text: string;
    isCollapsed?: boolean;
};

/**
 * Model reference part - indicates which model was used
 */
export type ModelPart = BaseMessagePart & {
    type: "model";
    id: string;
    provider?: string;
};

/**
 * Tool call part - when the model calls a tool
 */
export type ToolCallPart = BaseMessagePart & {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
};

/**
 * Tool result part - result from tool execution
 */
export type ToolResultPart = BaseMessagePart & {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    result: unknown;
    isError?: boolean;
};

/**
 * Source/citation part - for RAG or web search results
 */
export type SourcePart = BaseMessagePart & {
    type: "source";
    url?: string;
    title?: string;
    content?: string;
    relevanceScore?: number;
};

/**
 * Code part - inline code or code blocks
 */
export type CodePart = BaseMessagePart & {
    type: "code";
    code: string;
    language?: string;
    filename?: string;
};

/**
 * Artifact reference part - references to created artifacts
 */
export type ArtifactPart = BaseMessagePart & {
    type: "artifact";
    artifactId: string;
    kind: ArtifactKind;
    title?: string;
};

/**
 * Image generation part - for AI-generated images
 */
export type ImagePart = BaseMessagePart & {
    type: "image";
    url: string;
    alt?: string;
    width?: number;
    height?: number;
    prompt?: string;
};

/**
 * Step indicator part - for multi-step reasoning
 */
export type StepPart = BaseMessagePart & {
    type: "step";
    stepNumber: number;
    title?: string;
    content: string;
};

/**
 * Unknown/fallback part for extensibility
 */
export type UnknownPart = BaseMessagePart & {
    type: string;
    [key: string]: unknown;
};

/**
 * Union of all known message part types
 */
export type MessagePart =
    | TextPart
    | FilePart
    | ReasoningPart
    | ModelPart
    | ToolCallPart
    | ToolResultPart
    | SourcePart
    | CodePart
    | ArtifactPart
    | ImagePart
    | StepPart
    | UnknownPart;

/**
 * Type guards for message parts
 */
export const MessagePartGuards = {
    isTextPart(part: MessagePart): part is TextPart {
        return (
            part.type === "text" && typeof (part as TextPart).text === "string"
        );
    },

    isFilePart(part: MessagePart): part is FilePart {
        return (
            part.type === "file" && typeof (part as FilePart).url === "string"
        );
    },

    isReasoningPart(part: MessagePart): part is ReasoningPart {
        return (
            part.type === "reasoning" &&
            typeof (part as ReasoningPart).text === "string"
        );
    },

    isModelPart(part: MessagePart): part is ModelPart {
        return (
            part.type === "model" && typeof (part as ModelPart).id === "string"
        );
    },

    isToolCallPart(part: MessagePart): part is ToolCallPart {
        return (
            part.type === "tool-call" &&
            typeof (part as ToolCallPart).toolCallId === "string" &&
            typeof (part as ToolCallPart).toolName === "string"
        );
    },

    isToolResultPart(part: MessagePart): part is ToolResultPart {
        return (
            part.type === "tool-result" &&
            typeof (part as ToolResultPart).toolCallId === "string" &&
            typeof (part as ToolResultPart).toolName === "string"
        );
    },

    isSourcePart(part: MessagePart): part is SourcePart {
        return part.type === "source";
    },

    isCodePart(part: MessagePart): part is CodePart {
        return (
            part.type === "code" && typeof (part as CodePart).code === "string"
        );
    },

    isArtifactPart(part: MessagePart): part is ArtifactPart {
        return (
            part.type === "artifact" &&
            typeof (part as ArtifactPart).artifactId === "string"
        );
    },

    isImagePart(part: MessagePart): part is ImagePart {
        return (
            part.type === "image" && typeof (part as ImagePart).url === "string"
        );
    },

    isStepPart(part: MessagePart): part is StepPart {
        return (
            part.type === "step" &&
            typeof (part as StepPart).stepNumber === "number" &&
            typeof (part as StepPart).content === "string"
        );
    },
};

/**
 * Extract text content from message parts
 */
export function extractTextFromParts(parts: MessagePart[]): string {
    return parts
        .filter(MessagePartGuards.isTextPart)
        .map((part) => part.text)
        .join("\n");
}

/**
 * Extract all file URLs from message parts
 */
export function extractFileUrlsFromParts(parts: MessagePart[]): string[] {
    return parts.filter(MessagePartGuards.isFilePart).map((part) => part.url);
}

/**
 * Get file name with fallback logic
 */
export function getFileName(part: FilePart): string {
    return part.name ?? part.filename ?? "file";
}

/**
 * Get media type with fallback logic
 */
export function getMediaType(part: FilePart): string | undefined {
    return part.mediaType ?? part.mimeType;
}

/**
 * Check if parts array contains any tool calls
 */
export function hasToolCalls(parts: MessagePart[]): boolean {
    return parts.some(MessagePartGuards.isToolCallPart);
}

/**
 * Check if parts array contains reasoning content
 */
export function hasReasoning(parts: MessagePart[]): boolean {
    return parts.some(MessagePartGuards.isReasoningPart);
}

/**
 * Parse unknown data into MessagePart array with validation
 */
export function parseMessageParts(data: unknown): MessagePart[] {
    if (!Array.isArray(data)) {
        return [];
    }

    return data
        .filter((item): item is Record<string, unknown> => {
            return typeof item === "object" && item !== null && "type" in item;
        })
        .map((item) => item as MessagePart);
}

/**
 * Validate a message part has required fields for its type
 */
export function isValidMessagePart(part: unknown): part is MessagePart {
    if (typeof part !== "object" || part === null) {
        return false;
    }

    const record = part as Record<string, unknown>;

    if (typeof record.type !== "string") {
        return false;
    }

    // Type-specific validation
    switch (record.type) {
        case "text":
            return typeof record.text === "string";
        case "file":
            return typeof record.url === "string";
        case "reasoning":
            return typeof record.text === "string";
        case "model":
            return typeof record.id === "string";
        case "tool-call":
            return (
                typeof record.toolCallId === "string" &&
                typeof record.toolName === "string"
            );
        case "tool-result":
            return (
                typeof record.toolCallId === "string" &&
                typeof record.toolName === "string"
            );
        case "code":
            return typeof record.code === "string";
        case "artifact":
            return typeof record.artifactId === "string";
        case "image":
            return typeof record.url === "string";
        case "step":
            return (
                typeof record.stepNumber === "number" &&
                typeof record.content === "string"
            );
        default:
            // Allow unknown types for extensibility
            return true;
    }
}

/**
 * Message role types
 */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/**
 * Complete message structure
 */
export type Message = {
    id: string;
    chatId: string;
    role: MessageRole;
    parts: MessagePart[];
    attachments?: MessageAttachment[];
    createdAt: string | Date;
    metadata?: MessageMetadata;
};

/**
 * Message attachment (legacy format)
 */
export type MessageAttachment = {
    url: string;
    name?: string;
    contentType?: string;
    size?: number;
};

/**
 * Message metadata
 */
export type MessageMetadata = {
    model?: string;
    provider?: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    duration?: number;
    finishReason?:
        | "stop"
        | "length"
        | "tool-calls"
        | "content-filter"
        | "error";
    [key: string]: unknown;
};

/**
 * Convert legacy attachment to FilePart
 */
export function attachmentToFilePart(attachment: MessageAttachment): FilePart {
    return {
        type: "file",
        url: attachment.url,
        name: attachment.name,
        mediaType: attachment.contentType,
        size: attachment.size,
    };
}

/**
 * Convert FilePart to legacy attachment format
 */
export function filePartToAttachment(part: FilePart): MessageAttachment {
    return {
        url: part.url,
        name: getFileName(part),
        contentType: getMediaType(part),
        size: part.size,
    };
}
