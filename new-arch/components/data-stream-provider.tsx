"use client";

/**
 * Data Stream Provider
 * Context for AI response data streaming
 *
 * Split into separate state/dispatch contexts to prevent unnecessary re-renders.
 * Components that only dispatch don't re-render when state changes.
 */

import type { DataUIPart } from "ai";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useState } from "react";
import { ChatSDKError } from "@/lib/errors";

// ============================================================================
// Types
// ============================================================================

/**
 * Custom UI data types for data stream parts.
 * These correspond to the custom data parts sent by the AI stream.
 */
export type CustomUIDataTypes = {
    textDelta: string;
    imageDelta: string;
    sheetDelta: string;
    codeDelta: string;
    suggestion: unknown;
    appendMessage: unknown;
    id: string;
    title: string;
    chatTitle: string;
    kind: string;
    clear: null;
    finish: null;
    usage: unknown;
};

export type DataStreamState = DataUIPart<CustomUIDataTypes>[];
export type DataStreamDispatch = Dispatch<
    SetStateAction<DataUIPart<CustomUIDataTypes>[]>
>;

// ============================================================================
// Contexts
// ============================================================================

const DataStreamStateContext = createContext<DataStreamState | null>(null);
const DataStreamDispatchContext = createContext<DataStreamDispatch | null>(
    null
);

// ============================================================================
// Provider
// ============================================================================

/**
 * DataStreamProvider - Manages AI response data stream state
 *
 * Features:
 * - Split contexts for optimized re-renders
 * - State context for reading data stream
 * - Dispatch context for updating data stream
 */
export function DataStreamProvider({ children }: { children: ReactNode }) {
    const [dataStream, setDataStream] = useState<
        DataUIPart<CustomUIDataTypes>[]
    >([]);

    // No useMemo needed: dataStream is primitive identity, setDataStream is stable
    return (
        <DataStreamStateContext.Provider value={dataStream}>
            <DataStreamDispatchContext.Provider value={setDataStream}>
                {children}
            </DataStreamDispatchContext.Provider>
        </DataStreamStateContext.Provider>
    );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Returns the current data stream state.
 * Components using this will re-render when dataStream changes.
 *
 * @throws ChatSDKError if used outside DataStreamProvider
 */
export function useDataStreamState(): DataStreamState {
    const context = useContext(DataStreamStateContext);
    if (context === null) {
        throw new ChatSDKError("bad_request:ui:dataStream_outside_provider");
    }
    return context;
}

/**
 * Returns the dispatch function to update data stream.
 * Components using this will NOT re-render when dataStream changes.
 *
 * @throws ChatSDKError if used outside DataStreamProvider
 */
export function useDataStreamDispatch(): DataStreamDispatch {
    const context = useContext(DataStreamDispatchContext);
    if (context === null) {
        throw new ChatSDKError("bad_request:ui:dataStream_outside_provider");
    }
    return context;
}

/**
 * Returns both state and dispatch (backward compatible).
 * Prefer useDataStreamState or useDataStreamDispatch for better performance.
 *
 * @throws ChatSDKError if used outside DataStreamProvider
 */
export function useDataStream() {
    const dataStream = useDataStreamState();
    const setDataStream = useDataStreamDispatch();
    return { dataStream, setDataStream };
}
