import type { UseChatHelpers } from "@ai-sdk/react";
import type { VisibilityType } from "@/components/visibility-selector";
import type { ModelMetadata } from "@/lib/ai/model-catalog-types";
import type { Attachment, ChatMessage, UserVote } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";

/**
 * Chat status states
 */
export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

/**
 * Chat state context - read-only state that causes re-renders
 */
export type ChatState = {
    chatId: string;
    messages: ChatMessage[];
    status: ChatStatus;
    error: Error | undefined;
    isReadonly: boolean;
    isGuest: boolean;
    usage?: AppUsage;
};

/**
 * Chat actions context - stable functions that don't cause re-renders
 */
export type ChatActions = {
    sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    regenerate: UseChatHelpers<ChatMessage>["regenerate"];
    stop: () => void;
    clearError: () => void;
};

/**
 * Model context - model selection state
 */
export type ModelState = {
    currentModelId: string;
    availableModels: ModelMetadata[];
    setModelId: (id: string) => void;
};

/**
 * Input context - input state isolated to prevent cascade re-renders
 */
export type InputState = {
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    attachments: Attachment[];
    setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
};

/**
 * Props for the main Chat component
 */
export type ChatProps = {
    id: string;
    initialMessages: ChatMessage[];
    initialChatModel: string;
    initialVisibilityType: VisibilityType;
    isReadonly: boolean;
    initialLastContext?: AppUsage;
    availableModels?: ModelMetadata[];
    initialVotes?: UserVote[];
};

/**
 * Props for ChatProvider
 */
export type ChatProviderProps = {
    children: React.ReactNode;
    chatId: string;
    initialMessages?: ChatMessage[] | undefined;
    initialChatModel?: string | undefined;
    initialModelId?: string | undefined; // Alias for initialChatModel
    initialVisibilityType?: VisibilityType | undefined;
    isReadonly?: boolean | undefined;
    isGuest?: boolean | undefined;
    initialLastContext?: AppUsage | undefined;
    availableModels?: ModelMetadata[] | undefined;
};
