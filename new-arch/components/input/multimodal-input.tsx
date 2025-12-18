"use client";

import equal from "fast-deep-equal";
import { memo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { AttachmentPreview } from "./attachment-preview";
import { useFileUpload } from "./hooks/use-file-upload";
import { StopButton, SubmitButton } from "./submit-button";
import { SuggestedActions } from "./suggested-actions";
import type { Attachment, MultimodalInputProps } from "./types";

function PureMultimodalInput({
    chatId,
    input,
    setInput,
    status,
    stop,
    attachments,
    setAttachments,
    messages,
    setMessages,
    sendMessage,
    className,
}: MultimodalInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { uploadQueue, handleFileChange } = useFileUpload({
        onUploadComplete: (uploaded) => {
            setAttachments((current) => [...current, ...uploaded]);
        },
    });

    const submitForm = useCallback(() => {
        if (!input.trim() && attachments.length === 0) {
            return;
        }

        window.history.replaceState({}, "", `/chat/${chatId}`);

        sendMessage({
            role: "user",
            parts: [
                ...attachments.map((attachment) => ({
                    type: "file" as const,
                    url: attachment.url,
                    name: attachment.name,
                    mediaType: attachment.contentType,
                })),
                { type: "text", text: input },
            ],
        });

        setAttachments([]);
        setInput("");
        textareaRef.current?.focus();
    }, [input, attachments, chatId, sendMessage, setAttachments, setInput]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (status !== "ready") {
            toast.error("Please wait for the model to finish its response!");
            return;
        }
        submitForm();
    };

    const handleRemoveAttachment = (url: string) => {
        setAttachments((current) => current.filter((a) => a.url !== url));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const showSuggestions =
        messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0;

    const hasAttachments = attachments.length > 0 || uploadQueue.length > 0;
    const canSubmit =
        (input.trim() || attachments.length > 0) && uploadQueue.length === 0;

    return (
        <div className={cn("relative flex w-full flex-col gap-4", className)}>
            {showSuggestions && (
                <SuggestedActions chatId={chatId} sendMessage={sendMessage} />
            )}

            <input
                aria-label="Upload attachments"
                className="hidden"
                multiple
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
            />

            <form
                className="rounded-xl border bg-background p-3 shadow-sm"
                onSubmit={handleSubmit}
            >
                {hasAttachments && (
                    <AttachmentList
                        attachments={attachments}
                        onRemove={handleRemoveAttachment}
                        uploadQueue={uploadQueue}
                    />
                )}

                <div className="flex items-end gap-2">
                    <Textarea
                        className="min-h-[44px] resize-none border-0 bg-transparent p-2 focus-visible:ring-0"
                        data-testid="multimodal-input"
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Send a message..."
                        ref={textareaRef}
                        rows={1}
                        value={input}
                    />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <AttachButton
                        disabled={status !== "ready"}
                        onClick={() => fileInputRef.current?.click()}
                    />
                    {status === "submitted" ? (
                        <StopButton setMessages={setMessages} stop={stop} />
                    ) : (
                        <SubmitButton disabled={!canSubmit} status={status} />
                    )}
                </div>
            </form>
        </div>
    );
}

type AttachmentListProps = {
    attachments: Attachment[];
    uploadQueue: string[];
    onRemove: (url: string) => void;
};

function AttachmentList({
    attachments,
    uploadQueue,
    onRemove,
}: AttachmentListProps) {
    return (
        <div
            className="flex gap-2 overflow-x-auto pb-2"
            data-testid="attachments-preview"
        >
            {attachments.map((attachment) => (
                <AttachmentPreview
                    attachment={attachment}
                    key={attachment.url}
                    onRemove={() => onRemove(attachment.url)}
                />
            ))}
            {uploadQueue.map((filename) => (
                <AttachmentPreview
                    attachment={{ url: "", name: filename, contentType: "" }}
                    isUploading
                    key={filename}
                />
            ))}
        </div>
    );
}

function AttachButton({
    onClick,
    disabled,
}: {
    onClick: () => void;
    disabled: boolean;
}) {
    return (
        <Button
            className="size-8"
            data-testid="attachments-button"
            disabled={disabled}
            onClick={onClick}
            size="icon"
            type="button"
            variant="ghost"
        >
            <PaperclipIcon />
        </Button>
    );
}

function PaperclipIcon() {
    return (
        <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
            />
        </svg>
    );
}

export const MultimodalInput = memo(PureMultimodalInput, (prev, next) => {
    if (prev.input !== next.input) {
        return false;
    }
    if (prev.status !== next.status) {
        return false;
    }
    if (!equal(prev.attachments, next.attachments)) {
        return false;
    }
    if (prev.messages.length !== next.messages.length) {
        return false;
    }
    return true;
});
