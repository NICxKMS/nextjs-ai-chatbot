/**
 * Stream Status Hook
 *
 * Provides stream status tracking for chat streaming operations.
 * Tracks streaming state, error handling, and status transitions.
 *
 * @module features/chat/hooks/use-stream-status
 */

"use client"

import { useCallback, useMemo, useState } from "react"

// =============================================================================
// Types
// =============================================================================

/**
 * Stream status states
 */
export type StreamStatus = "idle" | "streaming" | "error"

/**
 * Stream error information
 */
export interface StreamError {
	/** Error message */
	message: string
	/** Error code if available */
	code?: string
	/** Original error object */
	originalError?: Error
}

/**
 * Stream status state returned by the hook
 */
export interface StreamStatusState {
	/** Current stream status */
	status: StreamStatus
	/** Whether currently streaming */
	isStreaming: boolean
	/** Whether stream is idle */
	isIdle: boolean
	/** Whether stream has error */
	hasError: boolean
	/** Error information if any */
	error: StreamError | null
}

/**
 * Stream status actions returned by the hook
 */
export interface StreamStatusActions {
	/** Start streaming - sets status to 'streaming' */
	startStreaming: () => void
	/** Stop streaming - sets status to 'idle' */
	stopStreaming: () => void
	/** Set error state with error information */
	setError: (error: StreamError | Error) => void
	/** Clear error and reset to idle */
	clearError: () => void
	/** Reset status to initial state */
	reset: () => void
}

/**
 * Return type for useStreamStatus hook
 */
export type UseStreamStatusReturn = StreamStatusState & StreamStatusActions

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for tracking and managing stream status
 *
 * Provides status tracking for chat streaming operations with
 * state transitions and error handling.
 *
 * @param initialStatus - Initial status state (default: 'idle')
 * @returns Stream status state and actions
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const {
 *     status,
 *     isStreaming,
 *     startStreaming,
 *     stopStreaming,
 *     setError,
 *   } = useStreamStatus()
 *
 *   const handleSubmit = async () => {
 *     startStreaming()
 *     try {
 *       await sendMessage()
 *       stopStreaming()
 *     } catch (error) {
 *       setError({ message: error.message })
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       {isStreaming && <Spinner />}
 *       <button onClick={handleSubmit}>Send</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useStreamStatus(
	initialStatus: StreamStatus = "idle",
): UseStreamStatusReturn {
	const [status, setStatus] = useState<StreamStatus>(initialStatus)
	const [error, setErrorState] = useState<StreamError | null>(null)

	// Derived state
	const isStreaming = useMemo(() => status === "streaming", [status])
	const isIdle = useMemo(() => status === "idle", [status])
	const hasError = useMemo(() => status === "error", [status])

	// Actions
	const startStreaming = useCallback(() => {
		setStatus("streaming")
		setErrorState(null)
	}, [])

	const stopStreaming = useCallback(() => {
		setStatus("idle")
	}, [])

	const setError = useCallback((err: StreamError | Error) => {
		setStatus("error")
		if (err instanceof Error) {
			setErrorState({
				message: err.message,
				originalError: err,
			})
		} else {
			setErrorState(err)
		}
	}, [])

	const clearError = useCallback(() => {
		setErrorState(null)
		setStatus("idle")
	}, [])

	const reset = useCallback(() => {
		setStatus("idle")
		setErrorState(null)
	}, [])

	return {
		// State
		status,
		isStreaming,
		isIdle,
		hasError,
		error,
		// Actions
		startStreaming,
		stopStreaming,
		setError,
		clearError,
		reset,
	}
}
