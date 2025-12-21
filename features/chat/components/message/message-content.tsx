/**
 * Message Content Component
 *
 * Renders the content of a chat message, handling both simple string content
 * and structured message parts (text, tool calls, reasoning, etc.).
 *
 * @module features/chat/components/message/message-content
 */

"use client";

import type { ChatMessage, MessagePart as MessagePartType } from "../../types";
import { MessagePart } from "./message-part";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface MessageContentProps {
    /** The message to render content from */
    message: ChatMessage;
    /** Whether the message is currently being streamed */
    isStreaming?: boolean;
    /** Whether this is a user message (affects styling) */
    isUser?: boolean;
    /** Optional additional class names */
    className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Converts UIMessage parts to our internal MessagePart type.
 * Handles the differences between AI SDK types and our defined types.
 */
function normalizeMessagePart(part: unknown): MessagePartType | null {
    if (!part || typeof part !== "object") return null;

    const p = part as Record<string, unknown>;

    switch (p.type) {
        case "text":
            return {
                type: "text",
                text: typeof p.text === "string" ? p.text : "",
            };

        case "reasoning":
            return {
                type: "reasoning",
                reasoning:
                    typeof p.text === "string"
                        ? p.text
                        : typeof p.reasoning === "string"
                          ? p.reasoning
                          : "",
            };

        case "tool-invocation":
        case "tool-call":
            return {
                type: "tool-call",
                toolCallId:
                    typeof p.toolCallId === "string" ? p.toolCallId : "",
                toolName: typeof p.toolName === "string" ? p.toolName : "",
                args: (p.args as Record<string, unknown>) || {},
            };

        case "tool-result":
            return {
                type: "tool-result",
                toolCallId:
                    typeof p.toolCallId === "string" ? p.toolCallId : "",
                toolName: typeof p.toolName === "string" ? p.toolName : "",
                result: p.result,
                isError: typeof p.isError === "boolean" ? p.isError : false,
            };

        case "source":
        case "source-url":
            return {
                type: "source",
                source: {
                    sourceType: "url",
                    id: typeof p.id === "string" ? p.id : "",
                    url: typeof p.url === "string" ? p.url : undefined,
                    title: typeof p.title === "string" ? p.title : undefined,
                },
            };

        default:
            return null;
    }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders message content, handling both parts-based and simple string formats.
 *
 * - For messages with a `parts` array: renders each part using MessagePart
 * - For simple messages: renders the content string directly
 *
 * User messages receive special styling (blue background, white text, rounded bubble).
 * Assistant messages use transparent background with prose styling.
 *
 * @example
 * ```tsx
 * // Message with parts
 * <MessageContent message={messageWithParts} />
 *
 * // Simple message while streaming
 * <MessageContent message={simpleMessage} isStreaming />
 *
 * // User message with bubble styling
 * <MessageContent message={userMessage} isUser />
 * ```
 */
export function MessageContent({
    message,
    isStreaming,
    isUser,
    className,
}: MessageContentProps) {
    // Check if message has parts array
    const hasParts =
        "parts" in message &&
        Array.isArray(message.parts) &&
        message.parts.length > 0;

    // Render parts-based content
    if (hasParts) {
        // Normalize all parts to our internal type
        const normalizedParts = message.parts
            .map(normalizeMessagePart)
            .filter((p): p is MessagePartType => p !== null);

        // Filter to only text parts for rendering (other parts handled separately)
        const textParts = normalizedParts.filter(
            (part): part is MessagePartType & { type: "text" } =>
                part.type === "text" && part.text.trim().length > 0
        );

        // Filter non-text parts (reasoning, tool calls, etc.)
        const otherParts = normalizedParts.filter(
            (part) => part.type !== "text"
        );

        return (
            <div className={cn("flex flex-col gap-2", className)}>
                {/* Render text content */}
                {textParts.length > 0 && (
                    <div
                        className={cn(
                            "break-words",
                            isUser &&
                                "w-fit rounded-2xl bg-[#006cff] px-3 py-2 text-white",
                            !isUser && "bg-transparent"
                        )}
                    >
                        <div className="space-y-2">
                            {textParts.map((part, index) => (
                                <MessagePart
                                    key={`${message.id}-text-${index}`}
                                    part={part}
                                    isStreaming={
                                        isStreaming &&
                                        index === textParts.length - 1
                                    }
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Render other parts (reasoning, tool calls, etc.) */}
                {otherParts.map((part, index) => (
                    <MessagePart
                        key={`${message.id}-part-${index}`}
                        part={part}
                        isStreaming={
                            isStreaming && index === otherParts.length - 1
                        }
                    />
                ))}
            </div>
        );
    }

    // No parts - nothing to render
    return null;
}
