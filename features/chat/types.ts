/**
 * Chat Feature Type Definitions
 *
 * Uses AI SDK types directly where available, only defines custom types
 * that the AI SDK doesn't provide.
 *
 * @module features/chat/types
 */

import type { UseChatHelpers } from "@ai-sdk/react";

// =============================================================================
// RE-EXPORTS FROM AI SDK
// =============================================================================

/**
 * Re-export core AI SDK types directly.
 * These are the canonical types from the Vercel AI SDK.
 */
export type { ChatRequestOptions, UIMessage } from "ai";

// Import UIMessage for local usage only (re-exported above)
import type { UIMessage } from "ai";

/**
 * ChatMessage type - uses UIMessage directly.
 * Provides semantic clarity when working with chat messages.
 */
export type ChatMessage = UIMessage;

/**
 * Chat status - matches AI SDK's useChat status.
 * Don't redefine what AI SDK already provides.
 */
export type ChatStatus = "submitted" | "streaming" | "ready" | "error";

/**
 * UseChatHelpers type from AI SDK - the return type of useChat hook.
 * Used for typing components that receive chat helpers.
 */
export type ChatHelpers = UseChatHelpers<ChatMessage>;

// =============================================================================
// ATTACHMENT TYPE
// =============================================================================

/**
 * File attachment for chat messages.
 * Extended version compatible with AI SDK's Attachment.
 */
export type Attachment = {
    /** Display name of the attachment */
    name: string;
    /** URL or data URI of the attachment content */
    url: string;
    /** MIME content type (e.g., 'image/png', 'application/pdf') */
    contentType: string;
};

// =============================================================================
// MESSAGE CREATION
// =============================================================================

/**
 * Simplified message creation type.
 * Used when creating new messages to send to the chat.
 */
export type CreateMessage = {
    /** Message content */
    content: string;
    /** Optional role (defaults to 'user') */
    role?: "user" | "assistant" | "system";
    /** Optional attachments */
    attachments?: Attachment[];
};

// =============================================================================
// MODEL TYPES (Custom - AI SDK doesn't provide)
// =============================================================================

/**
 * Text content part of a message.
 */
export type TextPart = {
    type: "text";
    /** The text content */
    text: string;
};

/**
 * Tool call part representing an AI tool invocation.
 */
export type ToolCallPart = {
    type: "tool-call";
    /** Unique identifier for this tool call */
    toolCallId: string;
    /** Name of the tool being called */
    toolName: string;
    /** Arguments passed to the tool */
    args: Record<string, unknown>;
};

/**
 * Tool result part representing the outcome of a tool call.
 */
export type ToolResultPart = {
    type: "tool-result";
    /** Identifier linking to the original tool call */
    toolCallId: string;
    /** Name of the tool that was called */
    toolName: string;
    /** Result returned by the tool */
    result: unknown;
    /** Whether the tool execution resulted in an error */
    isError?: boolean;
};

/**
 * Reasoning part for displaying AI's chain-of-thought.
 */
export type ReasoningPart = {
    type: "reasoning";
    /** The reasoning/thinking text */
    reasoning: string;
    /** Additional structured details about the reasoning */
    details?: unknown[];
};

/**
 * Source/citation part for referencing external content.
 */
export type SourcePart = {
    type: "source";
    /** Source metadata */
    source: {
        /** Type of source */
        sourceType: "url" | "file";
        /** Unique identifier for the source */
        id: string;
        /** URL of the source (for url type) */
        url?: string;
        /** Display title for the source */
        title?: string;
        /** Additional provider-specific metadata */
        providerMetadata?: Record<string, unknown>;
    };
};

/**
 * Union of all message part types for type-safe rendering.
 */
export type MessagePart =
    | TextPart
    | ToolCallPart
    | ToolResultPart
    | ReasoningPart
    | SourcePart;

// =============================================================================
// MODEL TYPES (re-exported from lib/types for layer compliance)
// =============================================================================

/**
 * Model capability flags and metadata.
 * Re-exported from lib/types - the canonical source.
 */
export type { ModelCapabilities, ModelMetadata } from "@/lib/types";

// Import for local use in ModelState
import type { ModelMetadata } from "@/lib/types";

/**
 * Model selection state interface.
 */
export type ModelState = {
    /** Currently selected model identifier */
    currentModelId: string;
    /** List of available models */
    availableModels: ModelMetadata[];
    /** Function to change the selected model */
    setModelId: (id: string) => void;
};

// =============================================================================
// VOTE TYPES (Custom - AI SDK doesn't provide)
// =============================================================================

/**
 * Type of vote a user can give to a message.
 */
export type VoteType = "up" | "down";

/**
 * Represents a user's vote on a message.
 */
export type MessageVote = {
    /** Chat session identifier */
    chatId: string;
    /** Message identifier */
    messageId: string;
    /** The vote type */
    vote: VoteType;
};

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

/**
 * Props for the main Chat component.
 */
export type ChatProps = {
    /** Unique identifier for the chat session */
    id: string;
    /** Optional initial messages to populate the chat */
    initialMessages?: ChatMessage[];
    /** Optional pre-selected model identifier */
    selectedModelId?: string;
    /** Whether the chat is in read-only mode */
    isReadonly?: boolean;
};

/**
 * Props for the ChatMessages component.
 */
export type ChatMessagesProps = {
    /** Array of votes for messages in the chat */
    votes?: MessageVote[];
    /** Whether the chat is in read-only mode */
    isReadonly?: boolean;
};

/**
 * Props for individual message item components.
 */
export type MessageItemProps = {
    /** The message to render */
    message: ChatMessage;
    /** Optional vote on this message */
    vote?: MessageVote;
    /** Whether the chat is in read-only mode */
    isReadonly?: boolean;
    /** Whether this message is currently being streamed */
    isStreaming?: boolean;
    /** Callback when user votes on the message */
    onVote?: (vote: VoteType) => void;
    /** Callback when user edits the message content */
    onEdit?: (content: string) => void;
    /** Callback when user copies the message */
    onCopy?: () => void;
};

/**
 * Props for the chat input component.
 */
export type ChatInputProps = {
    /** Whether input is disabled */
    disabled?: boolean;
    /** Placeholder text for the input */
    placeholder?: string;
};

// =============================================================================
// SERVER ACTION TYPES
// =============================================================================

/**
 * Parameters for generating a chat title.
 */
export type GenerateTitleParams = {
    /** The message to generate a title from */
    message: string;
};

/**
 * Parameters for deleting messages after a timestamp.
 */
export type DeleteMessagesParams = {
    /** Chat session identifier */
    chatId: string;
    /** Delete messages created after this timestamp */
    afterTimestamp: Date;
};

/**
 * Parameters for updating chat visibility.
 */
export type UpdateVisibilityParams = {
    /** Chat session identifier */
    chatId: string;
    /** New visibility setting */
    visibility: "public" | "private";
};

// =============================================================================
// VISIBILITY TYPES (re-exported from shared/types to prevent circular deps)
// =============================================================================

/**
 * Chat visibility options.
 * Re-exported from shared/types - the canonical source.
 */
export type { VisibilityType } from "@/shared/types";
