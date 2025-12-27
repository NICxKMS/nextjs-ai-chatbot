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
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

/**
 * Map to track AbortControllers for each upload by file name.
 * Allows individual upload cancellation.
 */
type UploadAbortMap = Map<string, AbortController>;

import { toast } from "sonner";
import {
    CLIENT_SUBMIT_RATE_LIMIT,
    CLIENT_UPLOAD_RATE_LIMIT,
    MAX_ATTACHMENT_FILE_SIZE_BYTES,
    MAX_CONCURRENT_UPLOADS,
} from "@/lib/config/security-constants";
import {
    createRateLimiter,
    sanitizeChatInput,
    validateChatInput,
} from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import { useChatHelpers, useChatMetadata, useModelState } from "../hooks";
import { uploadFile as uploadFileApi } from "../services/chat-api";
import type { Attachment, ChatInputProps } from "../types";
import { validateFileUploadResponse } from "../types/api-schemas";
import {
    AttachmentButton,
    AttachmentPreviews,
    StopButton,
    SubmitButton,
} from "./input";
import { ModelSelectorCompact } from "./model-selector-compact";
import { SuggestedActions } from "./suggested-actions";

// =============================================================================
// CONSTANTS (P3-036: Using centralized security constants)
// =============================================================================

/**
 * Accepted file types for attachments.
 * Supports images, PDFs, and common text formats.
 */
const ACCEPTED_FILE_TYPES = "image/*,application/pdf,.txt,.md,.csv,.json";

/**
 * localStorage key for persisting input text.
 */
const LOCAL_STORAGE_KEY = "chat-input";

/**
 * Debounce delay in milliseconds for saving input to localStorage.
 * Prevents excessive writes during rapid typing.
 */
const LOCAL_STORAGE_DEBOUNCE_MS = 500;

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
export const ChatInput = memo(function ChatInput({
    disabled,
    placeholder,
}: ChatInputProps) {
    const { messages, sendMessage, stop, status } = useChatHelpers();
    const { chatId, isReadonly, isGuest } = useChatMetadata();
    const { currentModelId, setModelId, availableModels } = useModelState();

    const [input, setInput] = useState("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [uploadQueue, setUploadQueue] = useState<string[]>([]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadAbortControllersRef = useRef<UploadAbortMap>(new Map());

    // Rate limiter for message submission (P3-036: centralized constants)
    const submitLimiterRef = useRef(
        createRateLimiter(CLIENT_SUBMIT_RATE_LIMIT)
    );

    // Rate limiter for file uploads (P3-036: centralized constants)
    const uploadLimiterRef = useRef(
        createRateLimiter(CLIENT_UPLOAD_RATE_LIMIT)
    );

    // Cleanup: abort all pending uploads on unmount
    useEffect(() => {
        const abortControllers = uploadAbortControllersRef.current;
        return () => {
            for (const controller of abortControllers.values()) {
                controller.abort();
            }
            abortControllers.clear();
        };
    }, []);

    // Track if localStorage has been loaded to prevent duplicate loads
    const hasLoadedFromStorageRef = useRef(false);

    // Load from localStorage on mount only
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        if (hasLoadedFromStorageRef.current) {
            return;
        }
        hasLoadedFromStorageRef.current = true;

        // Note: !input check removed - on mount input is always empty,
        // and hasLoadedFromStorageRef guard already prevents duplicate loads
        const savedInput = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedInput) {
            setInput(savedInput);
        }
    }, []);

    // Save to localStorage on change (debounced)
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        const timeout = setTimeout(() => {
            if (input) {
                localStorage.setItem(LOCAL_STORAGE_KEY, input);
            } else {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        }, LOCAL_STORAGE_DEBOUNCE_MS);
        return () => clearTimeout(timeout);
    }, [input]);

    // Memoize derived state to prevent recalculation on every render
    const isLoading = useMemo(
        () => status === "submitted" || status === "streaming",
        [status]
    );
    const isDisabled = useMemo(
        () => isReadonly || disabled,
        [isReadonly, disabled]
    );
    const hasContent = useMemo(
        () => input.trim().length > 0 || attachments.length > 0,
        [input, attachments.length]
    );
    const canSubmit = useMemo(
        () => !isDisabled && hasContent && uploadQueue.length === 0,
        [isDisabled, hasContent, uploadQueue.length]
    );

    /**
     * Upload a single file to the server.
     * Uses AbortController for cancellation support.
     *
     * Note: Empty dependency array is intentional:
     * - uploadAbortControllersRef is a ref (stable reference)
     * - toast and fetch are module-level imports (stable)
     * - mapHttpError is a module-level function (stable)
     */
    const uploadFile = useCallback(
        async (file: File): Promise<Attachment | undefined> => {
            // Create AbortController for this upload
            const abortController = new AbortController();
            uploadAbortControllersRef.current.set(file.name, abortController);

            try {
                const rawData = await uploadFileApi(
                    file,
                    abortController.signal
                );

                // Validate response schema
                const validation = validateFileUploadResponse(rawData);
                if (!validation.success) {
                    logger.error("Invalid file upload response", {
                        endpoint: "/api/files/upload",
                        error: validation.error.format(),
                        fileName: file.name,
                    });
                    toast.error("Upload failed: Invalid response from server");
                    return;
                }

                const { url, pathname, contentType, filename } =
                    validation.data;

                return {
                    url,
                    name: filename ?? pathname ?? file.name,
                    contentType,
                };
            } catch (error) {
                // Don't show error toast if the upload was aborted
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Upload failed. Please check your connection and try again."
                );
            } finally {
                // Cleanup: remove this controller from the map
                uploadAbortControllersRef.current.delete(file.name);
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

            // Check rate limit for file uploads
            const result = uploadLimiterRef.current.check();
            if (!result.allowed) {
                toast.error(
                    `Too many uploads. Try again in ${Math.ceil(result.resetIn / 1000)}s`
                );
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                return;
            }

            // Validate file sizes before upload
            const oversizedFiles = files.filter(
                (file) => file.size > MAX_ATTACHMENT_FILE_SIZE_BYTES
            );
            if (oversizedFiles.length > 0) {
                const fileNames = oversizedFiles.map((f) => f.name).join(", ");
                const maxSizeMB = MAX_ATTACHMENT_FILE_SIZE_BYTES / 1024 / 1024;
                toast.error(
                    `File(s) too large: ${fileNames}. Maximum size is ${maxSizeMB}MB.`
                );
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
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
     * Cancel a pending upload by file name.
     * @internal Reserved for future cancel button in file upload progress UI.
     * Currently prefixed with _ as unused. Expose when adding cancel button.
     */
    const _cancelUpload = useCallback((fileName: string) => {
        const controller = uploadAbortControllersRef.current.get(fileName);
        if (controller) {
            controller.abort();
            uploadAbortControllersRef.current.delete(fileName);
        }
        setUploadQueue((prev) => prev.filter((name) => name !== fileName));
    }, []);

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

            // Sanitize and validate input before submission
            const sanitizedInput = sanitizeChatInput(input);
            const validationError = validateChatInput(sanitizedInput);
            if (validationError) {
                toast.error(validationError);
                return;
            }

            // Check rate limit for message submission
            const result = submitLimiterRef.current.check();
            if (!result.allowed) {
                toast.error(
                    `Slow down! Too many messages. Try again in ${Math.ceil(result.resetIn / 1000)}s`
                );
                return;
            }

            // Update URL to chat ID if not already on a chat page
            // This ensures the URL reflects the current chat session
            if (
                typeof window !== "undefined" &&
                !window.location.pathname.includes("/chat/")
            ) {
                window.history.replaceState({}, "", `/chat/${chatId}`);
            }

            // AI SDK sendMessage with UIMessage parts format
            // Include file attachments followed by text content
            sendMessage({
                role: "user",
                parts: [
                    ...attachments.map((attachment) => ({
                        type: "file" as const,
                        url: attachment.url,
                        name: attachment.name,
                        mediaType: attachment.contentType,
                    })),
                    {
                        type: "text" as const,
                        text: sanitizedInput,
                    },
                ],
            });

            setInput("");
            setAttachments([]);
            localStorage.removeItem(LOCAL_STORAGE_KEY);

            // Focus textarea after submit
            textareaRef.current?.focus();
        },
        [attachments, canSubmit, chatId, input, sendMessage, status]
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
                        maxLength={32_000}
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
});
