/**
 * ChatInput Component
 *
 * Multimodal input component supporting text and file attachments.
 * Provides the main interface for users to send messages and attachments.
 *
 * @module features/chat/components/chat-input
 */

"use client";

import {
    type ChangeEvent,
    type FormEvent,
    type KeyboardEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";
import { useChatHelpers, useChatMetadata, useModelState } from "../hooks";
import type { Attachment, ChatInputProps } from "../types";
import {
    AttachmentButton,
    AttachmentPreviews,
    StopButton,
    SubmitButton,
} from "./input";
import { ModelSelectorCompact } from "./model-selector-compact";
import { SuggestedActions } from "./suggested-actions";

/**
 * Maximum number of concurrent file uploads.
 */
const MAX_CONCURRENT_UPLOADS = 3;

/**
 * Accepted file types for attachments.
 */
const ACCEPTED_FILE_TYPES = "image/*,application/pdf,.txt,.md,.csv,.json";

/**
 * localStorage key for persisting input text.
 */
const LOCAL_STORAGE_KEY = "chat-input";

/**
 * Multimodal chat input component with text and file attachment support.
 *
 * @remarks
 * Features:
 * - Auto-resizing textarea
 * - File attachment with preview
 * - Submit on Enter (Shift+Enter for newline)
 * - Stop button during streaming
 * - Guest mode indicator
 *
 * Visual parity with oldapp/components/multimodal-input.tsx
 *
 * @example
 * ```tsx
 * <ChatInput placeholder="Ask anything..." />
 * ```
 */
export function ChatInput({ disabled, placeholder }: ChatInputProps) {
    const { messages, sendMessage, stop, status } = useChatHelpers();
    const { chatId, isReadonly, isGuest } = useChatMetadata();
    const { currentModelId, setModelId, availableModels } = useModelState();

    const [input, setInput] = useState("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [uploadQueue, setUploadQueue] = useState<string[]>([]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const savedInput = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedInput && !input) {
            setInput(savedInput);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [input]);

    // Save to localStorage on change (debounced 500ms)
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (input) {
                localStorage.setItem(LOCAL_STORAGE_KEY, input);
            } else {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [input]);

    const isLoading = status === "submitted" || status === "streaming";
    const isDisabled = isReadonly || disabled;
    const hasContent = input.trim().length > 0 || attachments.length > 0;
    const canSubmit = !isDisabled && hasContent && uploadQueue.length === 0;

    /**
     * Upload a single file to the server.
     */
    const uploadFile = useCallback(
        async (file: File): Promise<Attachment | undefined> => {
            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch("/api/files/upload", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    const { url, pathname, contentType, filename } = data;

                    return {
                        url,
                        name: filename ?? pathname ?? file.name,
                        contentType,
                    };
                }

                const { error } = await response.json();
                toast.error(error || "Failed to upload file");
            } catch (_error) {
                toast.error("Failed to upload file, please try again!");
            }

            return;
        },
        []
    );

    /**
     * Handle file selection from the file input.
     */
    const handleFileChange = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || []);
            if (files.length === 0) {
                return;
            }

            setUploadQueue(files.map((file) => file.name));

            try {
                const uploadedAttachments: Attachment[] = [];

                // Upload files in batches to avoid overwhelming the server
                for (let i = 0; i < files.length; i += MAX_CONCURRENT_UPLOADS) {
                    const batch = files.slice(i, i + MAX_CONCURRENT_UPLOADS);
                    const batchResults = await Promise.all(
                        batch.map((file) => uploadFile(file))
                    );

                    const successfulUploads = batchResults.filter(
                        (result): result is Attachment => result !== undefined
                    );
                    uploadedAttachments.push(...successfulUploads);
                }

                setAttachments((prev) => [...prev, ...uploadedAttachments]);
            } finally {
                setUploadQueue([]);
                // Reset file input so the same file can be selected again
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        },
        [uploadFile]
    );

    /**
     * Remove an attachment by index.
     */
    const removeAttachment = useCallback((index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }, []);

    /**
     * Submit the message.
     */
    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();

            if (!canSubmit) {
                return;
            }

            if (status !== "ready") {
                toast.error(
                    "Please wait for the model to finish its response!"
                );
                return;
            }

            // AI SDK sendMessage uses { text, files } format
            sendMessage({
                text: input.trim(),
                // TODO: Handle attachments via files API when needed
            });

            setInput("");
            setAttachments([]);
            localStorage.removeItem(LOCAL_STORAGE_KEY);

            // Focus textarea after submit
            textareaRef.current?.focus();
        },
        [canSubmit, input, sendMessage, status]
    );

    /**
     * Handle keyboard events for submit shortcut.
     */
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
            // Submit on Enter (without Shift)
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
        },
        [handleSubmit]
    );

    /**
     * Handle text input changes.
     */
    const handleInputChange = useCallback(
        (e: ChangeEvent<HTMLTextAreaElement>) => {
            setInput(e.target.value);
        },
        []
    );

    /**
     * Trigger file input click.
     */
    const handleAttachClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return (
        <div className="relative flex w-full flex-col gap-4">
            {/* Suggested actions - shown only when chat is empty */}
            {messages.length === 0 &&
                attachments.length === 0 &&
                uploadQueue.length === 0 && (
                    <SuggestedActions
                        chatId={chatId}
                        sendMessage={sendMessage}
                    />
                )}

            {/* Hidden file input */}
            <input
                accept={ACCEPTED_FILE_TYPES}
                aria-label="Upload attachments"
                className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
                multiple
                onChange={handleFileChange}
                ref={fileInputRef}
                tabIndex={-1}
                type="file"
            />

            <form
                className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50"
                onSubmit={handleSubmit}
            >
                {/* Attachment previews */}
                <AttachmentPreviews
                    attachments={attachments}
                    onRemove={removeAttachment}
                    uploadQueue={uploadQueue}
                />

                {/* Input area */}
                <div className="flex flex-row items-start gap-1 sm:gap-2">
                    <textarea
                        autoFocus
                        className="max-h-[200px] min-h-[44px] grow resize-none border-none bg-transparent p-2 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
                        data-testid="chat-input"
                        disabled={isLoading || isDisabled}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder ?? "Send a message..."}
                        ref={textareaRef}
                        rows={1}
                        value={input}
                    />
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <AttachmentButton
                            disabled={isLoading || isDisabled}
                            onClick={handleAttachClick}
                        />
                        <ModelSelectorCompact
                            disabled={isLoading || isDisabled}
                            models={availableModels}
                            onModelChange={setModelId}
                            selectedModelId={currentModelId}
                        />
                    </div>

                    {/* Submit or Stop button */}
                    {isLoading ? (
                        <StopButton onClick={stop} />
                    ) : (
                        <SubmitButton disabled={!canSubmit} />
                    )}
                </div>
            </form>

            {/* Guest mode indicator */}
            {isGuest && (
                <p className="text-center text-muted-foreground text-xs">
                    Sign in to save your conversations
                </p>
            )}
        </div>
    );
}
