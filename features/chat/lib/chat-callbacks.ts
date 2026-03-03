import type { UIMessage } from "ai"

// ── Types ────────────────────────────────────────────────────
// Callback factory parameter types. These use structural typing so
// consumers can inject any compatible function — not just specific
// data-layer implementations. This makes factories testable with stubs.

/** Function that persists messages to the data layer */
type SaveMessageFn = (messages: { chatId: string; messages: UIMessage[] }) => Promise<void>

/** Function that updates a chat title in the data layer */
type UpdateTitleFn = (chatId: string, title: string) => Promise<void>

// ── Callback return types ────────────────────────────────────

/** Callback for when the AI finishes generating a response */
export type OnMessageCallback = (message: UIMessage) => void

/** Callback for when a chat title is generated */
export type OnTitleCallback = (title: string) => void

/** Callback for when a chat error occurs */
export type OnErrorCallback = (error: Error) => void

// ── Factory: onMessage ───────────────────────────────────────
// Creates a callback that persists the assistant message when
// the AI finishes responding. Injected into useChatSession (P3-T11)
// so the orchestrator remains thin and testable.

export function createOnMessageCallback(
	chatId: string,
	saveMessage: SaveMessageFn,
): OnMessageCallback {
	return (message: UIMessage) => {
		// Fire-and-forget: persistence errors are logged server-side,
		// not surfaced to the user during streaming.
		void saveMessage({ chatId, messages: [message] })
	}
}

// ── Factory: onTitle ─────────────────────────────────────────
// Creates a callback that updates the chat title when the server
// generates one. Title is delivered via the chat-title data part
// in the stream and handled in useChatSession's onData handler.

export function createOnTitleCallback(chatId: string, updateTitle: UpdateTitleFn): OnTitleCallback {
	return (title: string) => {
		void updateTitle(chatId, title)
	}
}

// ── Factory: onError ─────────────────────────────────────────
// Creates a callback for chat-level errors. The returned function
// is injected into useChat's onError option. Consumers (P3-T11)
// can wire this to toast notifications or other error handling.

export function createOnErrorCallback(_chatId: string): OnErrorCallback {
	return (error: Error) => {
		// Error is surfaced via useChat's `error` state and displayed
		// in the UI. This callback exists for side-effect extraction
		// (e.g., logging, analytics) without polluting the orchestrator.
		console.error(`[chat:${_chatId}] Stream error:`, error.message)
	}
}
