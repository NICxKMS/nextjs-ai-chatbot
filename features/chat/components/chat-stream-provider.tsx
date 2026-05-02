"use client"

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react"

import type { DataPart } from "@/features/chat/types/chat.types"

// ── Split Contexts ───────────────────────────────────────────
// StateCtx holds the accumulated data parts — consumed by readers (StreamBridge).
// DispatchCtx holds the setter — consumed by writers (useChatSession.onData).
// Splitting prevents writer-only components from re-rendering on state changes.

interface ChatStreamState {
	chatStream: DataPart[]
}

interface ChatStreamDispatch {
	setChatStream: (updater: DataPart[] | ((prev: DataPart[]) => DataPart[])) => void
}

const StateCtx = createContext<ChatStreamState | null>(null)
const DispatchCtx = createContext<ChatStreamDispatch | null>(null)

// ── Provider ─────────────────────────────────────────────────
// Page-scoped provider for SSE data part accumulation.
// RAF batching coalesces ~200 SSE deltas/sec → ~60 React updates/sec.

export function ChatStreamProvider({ children }: { children: ReactNode }) {
	const [chatStream, setRaw] = useState<DataPart[]>([])
	const pendingRef = useRef<DataPart[]>([])
	const rafRef = useRef<number | null>(null)

	const setChatStream = useCallback(
		(updater: DataPart[] | ((prev: DataPart[]) => DataPart[])) => {
			// Function updaters bypass RAF batching — used for resets (e.g., onFinish clearing)
			if (typeof updater === "function") {
				setRaw(updater)
				return
			}

			// Array values are batched via requestAnimationFrame
			// Coalesces rapid SSE pushes into a single React state update per frame
			pendingRef.current.push(...updater)
			if (rafRef.current === null) {
				rafRef.current = requestAnimationFrame(() => {
					const batch = pendingRef.current
					pendingRef.current = []
					rafRef.current = null
					setRaw((prev) => [...prev, ...batch])
				})
			}
		},
		[],
	)

	// Clean up pending RAF on unmount to prevent memory leaks
	useEffect(() => {
		return () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current)
			}
		}
	}, [])

	return (
		<DispatchCtx.Provider value={{ setChatStream }}>
			<StateCtx.Provider value={{ chatStream }}>{children}</StateCtx.Provider>
		</DispatchCtx.Provider>
	)
}

// ── Hooks ────────────────────────────────────────────────────

/**
 * Read the current chat stream state (accumulated data parts).
 * Components using this re-render when new deltas arrive.
 * Consumed by StreamBridge to process artifact deltas.
 */
export function useChatStream(): ChatStreamState {
	const ctx = useContext(StateCtx)
	if (ctx === null) {
		throw new Error("useChatStream must be used within a ChatStreamProvider")
	}
	return ctx
}

/**
 * Get the dispatch function to update the chat stream.
 * Components using this do NOT re-render when stream state changes.
 * Consumed by useChatSession.onData to push artifact-* parts.
 */
export function useChatStreamDispatch(): ChatStreamDispatch {
	const ctx = useContext(DispatchCtx)
	if (ctx === null) {
		throw new Error("useChatStreamDispatch must be used within a ChatStreamProvider")
	}
	return ctx
}
