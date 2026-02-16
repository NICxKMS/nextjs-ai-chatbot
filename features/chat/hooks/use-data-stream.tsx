/**
 * Data Stream Context Hook
 *
 * Provides access to the SSE data stream context for real-time updates.
 * Split into state and dispatch contexts to prevent unnecessary re-renders.
 *
 * @module features/chat/hooks/use-data-stream
 */

"use client"

import type { DataUIPart } from "ai"
import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"
import { AppError, ErrorCodes } from "@/lib/errors"
import type { CustomUIDataTypes } from "../types"

// =============================================================================
// Types
// =============================================================================

/**
 * Data stream state type
 */
type DataStreamState = DataUIPart<CustomUIDataTypes>[]

/**
 * Data stream dispatch type
 */
type DataStreamDispatch = React.Dispatch<
	React.SetStateAction<DataUIPart<CustomUIDataTypes>[]>
>

// =============================================================================
// Contexts
// =============================================================================

/**
 * State context for data stream
 * Components using this will re-render when dataStream changes.
 */
const DataStreamStateContext = createContext<DataStreamState | null>(null)

/**
 * Dispatch context for data stream
 * Components using this will NOT re-render when dataStream changes.
 */
const DataStreamDispatchContext = createContext<DataStreamDispatch | null>(null)

// =============================================================================
// Provider
// =============================================================================

/**
 * Props for DataStreamProvider
 */
export interface DataStreamProviderProps {
	/** Child components */
	children: ReactNode
}

/**
 * Provider component for data stream context
 *
 * Split contexts prevent unnecessary re-renders:
 * - Components that only dispatch don't re-render when state changes
 * - Components that only read state can subscribe independently
 *
 * @example
 * ```tsx
 * <DataStreamProvider>
 *   <Chat />
 * </DataStreamProvider>
 * ```
 */
export function DataStreamProvider({ children }: DataStreamProviderProps) {
	const [dataStream, setDataStream] = useState<DataStreamState>([])

	return (
		<DataStreamStateContext.Provider value={dataStream}>
			<DataStreamDispatchContext.Provider value={setDataStream}>
				{children}
			</DataStreamDispatchContext.Provider>
		</DataStreamStateContext.Provider>
	)
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Returns the current data stream state
 *
 * Components using this will re-render when dataStream changes.
 *
 * @throws {AppError} If used outside DataStreamProvider
 * @returns Current data stream state
 *
 * @example
 * ```tsx
 * const dataStream = useDataStreamState()
 * // Use dataStream for rendering
 * ```
 */
export function useDataStreamState(): DataStreamState {
	const context = useContext(DataStreamStateContext)
	if (context === null) {
		throw new AppError(
			ErrorCodes.VALIDATION_ERROR,
			"useDataStreamState must be used within a DataStreamProvider",
			400,
		)
	}
	return context
}

/**
 * Returns the dispatch function to update data stream
 *
 * Components using this will NOT re-render when dataStream changes.
 *
 * @throws {AppError} If used outside DataStreamProvider
 * @returns Dispatch function for updating data stream
 *
 * @example
 * ```tsx
 * const setDataStream = useDataStreamDispatch()
 * setDataStream([...dataStream, newDelta])
 * ```
 */
export function useDataStreamDispatch(): DataStreamDispatch {
	const context = useContext(DataStreamDispatchContext)
	if (context === null) {
		throw new AppError(
			ErrorCodes.VALIDATION_ERROR,
			"useDataStreamDispatch must be used within a DataStreamProvider",
			400,
		)
	}
	return context
}

/**
 * Returns both state and dispatch (backward compatible)
 *
 * Prefer useDataStreamState or useDataStreamDispatch for better performance.
 *
 * @throws {AppError} If used outside DataStreamProvider
 * @returns Object containing dataStream state and setDataStream dispatch
 *
 * @example
 * ```tsx
 * const { dataStream, setDataStream } = useDataStream()
 * ```
 */
export function useDataStream() {
	const dataStream = useDataStreamState()
	const setDataStream = useDataStreamDispatch()
	return { dataStream, setDataStream }
}
