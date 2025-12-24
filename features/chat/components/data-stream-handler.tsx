/**
 * Data Stream Handler Component
 *
 * Processes streaming data parts from AI SDK responses.
 * Handles title updates, usage tracking, and artifact streaming.
 *
 * @module features/chat/components/data-stream-handler
 */

"use client";

import { useCallback, useEffect } from "react";
import type { DataStreamPart } from "./data-stream-provider";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Token usage data from AI response.
 */
export type DataUsageType = {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
};

/**
 * Chat title update data part.
 */
type DataChatTitlePart = {
    type: "data-chatTitle";
    data: string;
};

/**
 * Usage data part.
 */
type DataUsagePart = {
    type: "data-usage";
    data: DataUsageType;
};

/**
 * Append message data part.
 */
type DataAppendMessagePart = {
    type: "data-appendMessage";
    data: string | Record<string, unknown>;
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for chat title data part.
 */
export function isDataChatTitlePart(part: unknown): part is DataChatTitlePart {
    return (
        typeof part === "object" &&
        part !== null &&
        (part as DataChatTitlePart).type === "data-chatTitle" &&
        typeof (part as DataChatTitlePart).data === "string"
    );
}

/**
 * Type guard for usage data part.
 */
export function isDataUsagePart(part: unknown): part is DataUsagePart {
    return (
        typeof part === "object" &&
        part !== null &&
        (part as DataUsagePart).type === "data-usage" &&
        typeof (part as DataUsagePart).data === "object"
    );
}

/**
 * Type guard for append message data part.
 */
export function isDataAppendMessagePart(
    part: unknown
): part is DataAppendMessagePart {
    return (
        typeof part === "object" &&
        part !== null &&
        (part as DataAppendMessagePart).type === "data-appendMessage"
    );
}

// =============================================================================
// HOOK
// =============================================================================

export type UseDataStreamHandlerOptions = {
    /** Callback when chat title is updated */
    onTitleUpdate?: (title: string) => void;
    /** Callback when usage data is received */
    onUsageUpdate?: (usage: DataUsageType) => void;
    /** Callback to update data stream state */
    setDataStream?: (
        updater: (prev: DataStreamPart[]) => DataStreamPart[]
    ) => void;
    /** Whether to enable artifact streaming */
    streamArtifacts?: boolean;
};

/**
 * Hook to create an onData handler for useChat.
 *
 * Returns a callback to process streaming data parts from AI SDK.
 * Handles title updates, usage tracking, and artifact streaming.
 *
 * @example
 * ```tsx
 * const { setDataStream } = useDataStream();
 * const handleData = useDataStreamHandler({
 *   onTitleUpdate: (title) => setTitle(title),
 *   onUsageUpdate: (usage) => setUsage(usage),
 *   setDataStream,
 *   streamArtifacts: true,
 * });
 *
 * useChat({
 *   onData: handleData,
 *   // ...
 * });
 * ```
 */
export function useDataStreamHandler({
    onTitleUpdate,
    onUsageUpdate,
    setDataStream,
    streamArtifacts = true,
}: UseDataStreamHandlerOptions = {}) {
    const handleData = useCallback(
        (dataPart: DataStreamPart) => {
            // Store for artifact processing
            if (streamArtifacts && setDataStream) {
                setDataStream((ds) => [...ds, dataPart]);
            }

            // Handle title updates
            if (isDataChatTitlePart(dataPart)) {
                onTitleUpdate?.(dataPart.data);
            }

            // Handle usage tracking
            if (isDataUsagePart(dataPart)) {
                onUsageUpdate?.(dataPart.data);
            }
        },
        [setDataStream, onTitleUpdate, onUsageUpdate, streamArtifacts]
    );

    return handleData;
}

// =============================================================================
// COMPONENT (for backwards compatibility)
// =============================================================================

export type DataStreamHandlerProps = {
    /** Callback when chat title is updated */
    onTitleUpdate?: (title: string) => void;
    /** Callback when usage data is received */
    onUsageUpdate?: (usage: DataUsageType) => void;
    /** Whether to enable artifact streaming */
    streamArtifacts?: boolean;
};

/**
 * DataStreamHandler - Placeholder component for data stream processing.
 *
 * Note: Data stream processing is now handled via the useDataStreamHandler hook
 * which creates an onData callback for useChat. This component is kept for
 * API compatibility but renders nothing.
 *
 * @deprecated Use useDataStreamHandler hook instead
 */
export function DataStreamHandler(_props: DataStreamHandlerProps): null {
    useEffect(() => {
        if (process.env.NODE_ENV === "development") {
            console.warn(
                "[DataStreamHandler] This component is deprecated. Use useDataStreamHandler hook instead."
            );
        }
    }, []);

    // Data stream processing is handled via useChat's onData callback
    // using the useDataStreamHandler hook
    return null;
}
