/**
 * Data Stream Provider Component
 *
 * Provides context for managing streaming data parts from AI SDK.
 * Handles title updates, usage data, and artifact streaming.
 *
 * @module features/chat/components/data-stream-provider
 */

"use client";

import type { DataUIPart } from "ai";
import {
    createContext,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
    useContext,
    useState,
} from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Data stream part type - using AI SDK's DataUIPart.
 * Generic to support custom data types.
 */
export type DataStreamPart = DataUIPart<Record<string, unknown>>;

// =============================================================================
// CONTEXT
// =============================================================================

type DataStreamContextValue = {
    /** Current data stream parts from AI response */
    dataStream: DataStreamPart[];
    /** Setter for data stream - used by DataStreamHandler */
    setDataStream: Dispatch<SetStateAction<DataStreamPart[]>>;
    /** Clear the data stream (reset to empty array) */
    clearDataStream: () => void;
};

const DataStreamContext = createContext<DataStreamContextValue | null>(null);
DataStreamContext.displayName = "DataStreamContext";

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export type DataStreamProviderProps = {
    children: ReactNode;
};

/**
 * DataStreamProvider - Manages streaming data parts from AI SDK.
 *
 * Provides context for storing and accessing data stream parts
 * that are processed during AI responses (title updates, usage, artifacts).
 *
 * @example
 * ```tsx
 * <DataStreamProvider>
 *   <ChatProvider>
 *     <DataStreamHandler />
 *     <Chat />
 *   </ChatProvider>
 * </DataStreamProvider>
 * ```
 */
export function DataStreamProvider({
    children,
}: DataStreamProviderProps): React.JSX.Element {
    const [dataStream, setDataStream] = useState<DataStreamPart[]>([]);

    const clearDataStream = () => setDataStream([]);

    return (
        <DataStreamContext.Provider
            value={{ dataStream, setDataStream, clearDataStream }}
        >
            {children}
        </DataStreamContext.Provider>
    );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access data stream context.
 *
 * @example
 * ```tsx
 * const { dataStream, clearDataStream } = useDataStream();
 * ```
 */
export function useDataStream(): DataStreamContextValue {
    const context = useContext(DataStreamContext);
    if (!context) {
        throw new Error("useDataStream must be used within DataStreamProvider");
    }
    return context;
}
