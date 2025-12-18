import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import type { Dispatch, SetStateAction } from "react";

/** Vote status for a message */
export type UserVote = {
    chatId: string;
    messageId: string;
    isUpvoted: boolean;
};

/** Mode for message display */
export type MessageMode = "view" | "edit";

/** File attachment in a message */
export type FilePart = {
    type: "file";
    url: string;
    mediaType: string;
    name?: string;
    filename?: string;
};

/** Text content part */
export type TextPart = {
    type: "text";
    text: string;
};

/** Reasoning content part */
export type ReasoningPart = {
    type: "reasoning";
    text: string;
};

/** Tool invocation part (generic) */
export type ToolPart = {
    type: string;
    toolCallId: string;
    state:
        | "input-streaming"
        | "input-available"
        | "output-available"
        | "output-error";
    input?: unknown;
    output?: unknown;
};

/** Source reference part */
export type SourcePart = {
    type: "source";
    url: string;
    title: string;
};

/** Union of all message parts */
export type MessagePart =
    | FilePart
    | TextPart
    | ReasoningPart
    | ToolPart
    | SourcePart;

/** Extended chat message with metadata */
export type ChatMessage = UIMessage & {
    metadata?: {
        createdAt?: string;
    };
};

/** Props for the main message component */
export type MessageProps = {
    chatId: string;
    message: ChatMessage;
    vote?: UserVote;
    isLoading: boolean;
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    regenerate: UseChatHelpers<ChatMessage>["regenerate"];
    isReadonly?: boolean;
    requiresScrollPadding?: boolean;
};

/** Props for message actions */
export type MessageActionsProps = {
    chatId: string;
    message: ChatMessage;
    vote?: UserVote;
    isLoading: boolean;
    setMode?: Dispatch<SetStateAction<MessageMode>>;
};

/** Props for message editor */
export type MessageEditorProps = {
    chatId: string;
    message: ChatMessage;
    setMode: Dispatch<SetStateAction<MessageMode>>;
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    regenerate: UseChatHelpers<ChatMessage>["regenerate"];
};

/** Props for message reasoning */
export type MessageReasoningProps = {
    isLoading: boolean;
    reasoning: string;
};

/** Props for message content renderer */
export type MessageContentProps = {
    message: ChatMessage;
    mode: MessageMode;
    isLoading: boolean;
    isReadonly?: boolean;
    chatId: string;
    setMode: Dispatch<SetStateAction<MessageMode>>;
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    regenerate: UseChatHelpers<ChatMessage>["regenerate"];
};
