/**
 * Message Part Component
 *
 * Renders individual message parts based on AI SDK UIMessage part types.
 * Supports text, tool calls, tool results, reasoning, and source citations.
 *
 * P3-015: Uses strategy pattern for extensible part rendering.
 *
 * @module features/chat/components/message/message-part
 */

"use client";

import { memo, type ReactNode } from "react";
import type {
    MessagePart as MessagePartType,
    ReasoningPart,
    SourcePart,
    TextPart,
    ToolCallPart,
    ToolResultPart,
} from "../../../types";
import { ReasoningPartView } from "./reasoning-part";
import { SourcePartView } from "./source-part";
import { TextPartView } from "./text-part";
import { ToolCallPartView } from "./tool-call-part";
import { ToolResultPartView } from "./tool-result-part";

// =============================================================================
// TYPES
// =============================================================================

export type MessagePartProps = {
    /** The message part to render */
    part: MessagePartType;
    /** Whether this part is currently being streamed */
    isStreaming?: boolean;
    /** Whether the chat is in readonly mode (e.g., shared chat) */
    isReadonly?: boolean;
    /** Optional additional class names */
    className?: string;
};

/** Context passed to each part renderer */
type PartRenderContext = {
    isStreaming?: boolean;
    isReadonly?: boolean;
    className?: string;
};

// =============================================================================
// TYPE GUARDS (P3-017: Replace type assertions with type guards)
// =============================================================================

function isTextPart(part: MessagePartType): part is TextPart {
    return part.type === "text" && "text" in part;
}

function isToolCallPart(part: MessagePartType): part is ToolCallPart {
    return (
        part.type === "tool-call" &&
        "toolCallId" in part &&
        "toolName" in part &&
        "args" in part
    );
}

function isToolResultPart(part: MessagePartType): part is ToolResultPart {
    return (
        part.type === "tool-result" &&
        "toolCallId" in part &&
        "toolName" in part &&
        "result" in part
    );
}

function isReasoningPart(part: MessagePartType): part is ReasoningPart {
    return part.type === "reasoning" && "reasoning" in part;
}

function isSourcePart(part: MessagePartType): part is SourcePart {
    return part.type === "source" && "source" in part;
}

// =============================================================================
// STRATEGY PATTERN (P3-015: Extensible part rendering)
// =============================================================================

/**
 * Strategy map for rendering different message part types.
 * Each strategy function takes the part and context, returns a ReactNode.
 *
 * Benefits:
 * - Extensible: Add new part types by adding to the map
 * - Testable: Each renderer can be tested in isolation
 * - Type-safe: Type guards ensure correct part shape
 */
const partRenderers: Record<
    MessagePartType["type"],
    (part: MessagePartType, ctx: PartRenderContext) => ReactNode
> = {
    text: (part, ctx) => {
        if (!isTextPart(part)) {
            return null;
        }
        return (
            <TextPartView
                className={ctx.className}
                isStreaming={ctx.isStreaming}
                text={part.text}
            />
        );
    },

    "tool-call": (part, ctx) => {
        if (!isToolCallPart(part)) {
            return null;
        }
        return (
            <ToolCallPartView
                args={part.args}
                className={ctx.className}
                isReadonly={ctx.isReadonly}
                toolCallId={part.toolCallId}
                toolName={part.toolName}
                type={part.type}
            />
        );
    },

    "tool-result": (part, ctx) => {
        if (!isToolResultPart(part)) {
            return null;
        }
        return (
            <ToolResultPartView
                className={ctx.className}
                isError={part.isError}
                isReadonly={ctx.isReadonly}
                result={part.result}
                toolCallId={part.toolCallId}
                toolName={part.toolName}
                type={part.type}
            />
        );
    },

    reasoning: (part, ctx) => {
        if (!isReasoningPart(part)) {
            return null;
        }
        return (
            <ReasoningPartView
                className={ctx.className}
                isStreaming={ctx.isStreaming}
                reasoning={part.reasoning}
            />
        );
    },

    source: (part, ctx) => {
        if (!isSourcePart(part)) {
            return null;
        }
        return (
            <SourcePartView className={ctx.className} source={part.source} />
        );
    },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Renders a single message part based on its type.
 *
 * Supports:
 * - `text`: Plain text content with prose styling
 * - `tool-call`: Tool invocation display with expandable parameters
 * - `tool-result`: Tool execution results with expandable output
 * - `reasoning`: Chain-of-thought reasoning display (collapsible)
 * - `source`: Citation/source references with links
 *
 * Document-related tool calls (createDocument, updateDocument, requestSuggestions)
 * are rendered using specialized DocumentPreview and DocumentToolCall components.
 *
 * @example
 * ```tsx
 * <MessagePart part={{ type: 'text', text: 'Hello!' }} />
 * <MessagePart part={{ type: 'reasoning', reasoning: 'Thinking about...' }} isStreaming />
 * <MessagePart part={{ type: 'tool-call', toolCallId: '1', toolName: 'search', args: { q: 'test' } }} />
 * ```
 */
export const MessagePart = memo(function MessagePart({
    part,
    isStreaming,
    isReadonly,
    className,
}: MessagePartProps) {
    // P3-015: Use strategy pattern for extensible rendering
    const renderer = partRenderers[part.type];
    const ctx: PartRenderContext = { isStreaming, isReadonly, className };

    // Use strategy if available, otherwise return null for unknown types
    return renderer ? renderer(part, ctx) : null;
});

export type { ReasoningPartViewProps } from "./reasoning-part";
export { ReasoningPartView } from "./reasoning-part";
export type { SourcePartViewProps } from "./source-part";
export { SourcePartView } from "./source-part";
// Re-export types and sub-components for flexibility
export type { TextPartViewProps } from "./text-part";
export { TextPartView } from "./text-part";
export type { ToolCallPartViewProps } from "./tool-call-part";
export { ToolCallPartView } from "./tool-call-part";
export type { ToolResultPartViewProps } from "./tool-result-part";
export { ToolResultPartView } from "./tool-result-part";
