"use client";

import type { DataUIPart } from "ai";
import type React from "react";
import { createContext, useContext, useState } from "react";
import { ChatSDKError } from "@/lib/errors";
import type { CustomUIDataTypes } from "@/lib/types";

// Split contexts to prevent unnecessary re-renders
// Components that only dispatch don't re-render when state changes
type DataStreamState = DataUIPart<CustomUIDataTypes>[];
type DataStreamDispatch = React.Dispatch<
    React.SetStateAction<DataUIPart<CustomUIDataTypes>[]>
>;

const DataStreamStateContext = createContext<DataStreamState | null>(null);
const DataStreamDispatchContext = createContext<DataStreamDispatch | null>(
    null
);

export function DataStreamProvider({
    children,
}: {
    children: React.ReactNode;
}) {
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

/**
 * Returns the current data stream state.
 * Components using this will re-render when dataStream changes.
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
 */
export function useDataStream() {
    const dataStream = useDataStreamState();
    const setDataStream = useDataStreamDispatch();
    return { dataStream, setDataStream };
}
