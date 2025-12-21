/**
 * Data Stream Provider Component
 *
 * Provides context for managing streaming data parts from AI SDK.
 * Handles title updates, usage data, and artifact streaming.
 *
 * Uses split context pattern (state/dispatch) to prevent unnecessary re-renders.
 * Components that only dispatch won't re-render when state changes.
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
    useCallback,
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

/**
 * State type for data stream context.
 */
type DataStreamState = DataStreamPart[];

/**
 * Dispatch type for data stream context.
 */
type DataStreamDispatch = Dispatch<SetStateAction<DataStreamPart[]>>;

// =============================================================================
// SPLIT CONTEXTS (Performance Optimization)
// =============================================================================

/**
 * Context for data stream state.
 * Components using this will re-render when dataStream changes.
 */
const DataStreamStateContext = createContext<DataStreamState | null>(null);
DataStreamStateContext.displayName = "DataStreamStateContext";

/**
 * Context for data stream dispatch.
 * Components using this will NOT re-render when dataStream changes.
 */
const DataStreamDispatchContext = createContext<DataStreamDispatch | null>(
    null
);
DataStreamDispatchContext.displayName = "DataStreamDispatchContext";

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export type DataStreamProviderProps = {
    children: ReactNode;
};

/**
 * DataStreamProvider - Manages streaming data parts from AI SDK.
 *
 * Uses split context pattern: separate contexts for state and dispatch.
 * This prevents unnecessary re-renders in components that only need dispatch.
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

    // No useMemo needed: dataStream is primitive identity, setDataStream is stable from useState
    return (
        <DataStreamStateContext.Provider value={dataStream}>
            <DataStreamDispatchContext.Provider value={setDataStream}>
                {children}
            </DataStreamDispatchContext.Provider>
        </DataStreamStateContext.Provider>
    );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Returns the current data stream state.
 * Components using this will re-render when dataStream changes.
 *
 * @example
 * ```tsx
 * const dataStream = useDataStreamState();
 * // Process data stream parts
 * ```
 */
export function useDataStreamState(): DataStreamState {
    const context = useContext(DataStreamStateContext);
    if (context === null) {
        throw new Error(
            "useDataStreamState must be used within DataStreamProvider"
        );
    }
    return context;
}

/**
 * Returns the dispatch function to update data stream.
 * Components using this will NOT re-render when dataStream changes.
 *
 * @example
 * ```tsx
 * const setDataStream = useDataStreamDispatch();
 * setDataStream(prev => [...prev, newPart]);
 * ```
 */
export function useDataStreamDispatch(): DataStreamDispatch {
    const context = useContext(DataStreamDispatchContext);
    if (context === null) {
        throw new Error(
            "useDataStreamDispatch must be used within DataStreamProvider"
        );
    }
    return context;
}

/**
 * Returns both state and dispatch with clearDataStream helper.
 * Backward compatible hook - prefer useDataStreamState or useDataStreamDispatch
 * for better performance when only one is needed.
 *
 * @example
 * ```tsx
 * const { dataStream, setDataStream, clearDataStream } = useDataStream();
 * ```
 */
export function useDataStream() {
    const dataStream = useDataStreamState();
    const setDataStream = useDataStreamDispatch();

    const clearDataStream = useCallback(() => {
        setDataStream([]);
    }, [setDataStream]);

    return { dataStream, setDataStream, clearDataStream };
}
