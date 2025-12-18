import type { UseChatHelpers } from "@ai-sdk/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ChatMessage } from "../message/types";

/** Attachment with URL, name, and content type */
export type Attachment = {
    url: string;
    name: string;
    contentType: string;
};

/** Chat status type */
export type ChatStatus = UseChatHelpers<ChatMessage>["status"];

/** Props for multimodal input component */
export type MultimodalInputProps = {
    chatId: string;
    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    status: ChatStatus;
    stop: () => void;
    attachments: Attachment[];
    setAttachments: Dispatch<SetStateAction<Attachment[]>>;
    messages: ChatMessage[];
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
    className?: string;
};

/** Props for attachment preview component */
export type AttachmentPreviewProps = {
    attachment: Attachment;
    isUploading?: boolean;
    onRemove?: () => void;
};

/** Props for suggested actions component */
export type SuggestedActionsProps = {
    chatId: string;
    sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
};

/** Props for submit button component */
export type SubmitButtonProps = {
    status: ChatStatus;
    disabled?: boolean;
    onClick?: () => void;
    className?: string;
};

/** Props for stop button component */
export type StopButtonProps = {
    stop: () => void;
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
};

/** Props for attachments button component */
export type AttachmentsButtonProps = {
    fileInputRef: RefObject<HTMLInputElement | null>;
    status: ChatStatus;
    disabled?: boolean;
};

/** Upload result from file upload hook */
export type UploadResult = {
    url: string;
    name: string;
    contentType: string;
};

/** File upload hook return type */
export type UseFileUploadReturn = {
    uploadQueue: string[];
    uploadFile: (file: File) => Promise<UploadResult | undefined>;
    handleFileChange: (
        event: React.ChangeEvent<HTMLInputElement>
    ) => Promise<void>;
    clearQueue: () => void;
};

/** Paste handler hook return type */
export type UsePasteHandlerReturn = {
    handlePaste: (event: ClipboardEvent) => void;
};
