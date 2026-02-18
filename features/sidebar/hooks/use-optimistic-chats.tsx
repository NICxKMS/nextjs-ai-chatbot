/**
 * Optimistic Chats Hook
 *
 * React context for managing optimistic chat entries in the sidebar.
 * Provides immediate UI feedback when creating new chats before server confirmation.
 *
 * @module features/sidebar/hooks/use-optimistic-chats
 */

"use client"

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useRef,
	useState,
} from "react"
import { ValidationError } from "@/lib/errors"

// =============================================================================
// Types
// =============================================================================

/**
 * Represents an optimistic chat entry that hasn't been confirmed by the server yet.
 */
export interface OptimisticChat {
	/** Unique identifier for the chat */
	id: string
	/** Display title (initially "New Chat" or placeholder) */
	title: string
	/** Creation timestamp */
	createdAt: Date
}

/**
 * Context value type for optimistic chats management.
 */
interface OptimisticChatsContextType {
	/** Array of current optimistic chats */
	optimisticChats: OptimisticChat[]
	/** Add a new optimistic chat entry */
	addOptimisticChat: (chatId: string, initialTitle?: string) => void
	/** Update the title of an existing optimistic chat */
	updateOptimisticChatTitle: (chatId: string, title: string) => void
	/** Remove an optimistic chat entry */
	removeOptimisticChat: (chatId: string) => void
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum number of optimistic chats to prevent unbounded memory growth.
 */
const MAX_OPTIMISTIC_CHATS = 50

// =============================================================================
// Context
// =============================================================================

const OptimisticChatsContext = createContext<OptimisticChatsContextType | null>(
	null,
)

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Provider component for optimistic chats state management.
 *
 * Features:
 * - O(1) duplicate detection using Set
 * - Memory-bounded storage (max 50 entries)
 * - Title update support for AI-generated titles
 *
 * @param props - Component props
 * @param props.children - Child components
 */
export function OptimisticChatsProvider({ children }: { children: ReactNode }) {
	const [optimisticChats, setOptimisticChats] = useState<OptimisticChat[]>([])

	// Use Set for O(1) duplicate detection instead of Array.some() which is O(n)
	const optimisticChatIdsRef = useRef(new Set<string>())

	/**
	 * Add a new optimistic chat entry.
	 * Prevents duplicates and enforces maximum size limit.
	 */
	const addOptimisticChat = useCallback(
		(chatId: string, initialTitle?: string) => {
			// O(1) duplicate check using Set
			if (optimisticChatIdsRef.current.has(chatId)) {
				return
			}
			optimisticChatIdsRef.current.add(chatId)

			setOptimisticChats((prev) => {
				const newChat: OptimisticChat = {
					id: chatId,
					title: initialTitle || "New Chat",
					createdAt: new Date(),
				}
				const updated = [newChat, ...prev]

				// Enforce maximum size limit to prevent unbounded memory growth
				if (updated.length > MAX_OPTIMISTIC_CHATS) {
					// Remove oldest entries and clean up the Set
					const removed = updated.slice(MAX_OPTIMISTIC_CHATS)
					for (const chat of removed) {
						optimisticChatIdsRef.current.delete(chat.id)
					}
					return updated.slice(0, MAX_OPTIMISTIC_CHATS)
				}

				return updated
			})
		},
		[],
	)

	/**
	 * Update the title of an existing optimistic chat.
	 * Used when AI generates a title during streaming.
	 */
	const updateOptimisticChatTitle = useCallback(
		(chatId: string, title: string) => {
			setOptimisticChats((prev) =>
				prev.map((chat) =>
					chat.id === chatId ? { ...chat, title } : chat,
				),
			)
		},
		[],
	)

	/**
	 * Remove an optimistic chat entry.
	 * Called when server confirms the chat or on error.
	 */
	const removeOptimisticChat = useCallback((chatId: string) => {
		optimisticChatIdsRef.current.delete(chatId)
		setOptimisticChats((prev) => prev.filter((chat) => chat.id !== chatId))
	}, [])

	return (
		<OptimisticChatsContext.Provider
			value={{
				optimisticChats,
				addOptimisticChat,
				updateOptimisticChatTitle,
				removeOptimisticChat,
			}}
		>
			{children}
		</OptimisticChatsContext.Provider>
	)
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access the optimistic chats context.
 *
 * @returns Optimistic chats context value
 * @throws ValidationError if used outside of OptimisticChatsProvider
 *
 * @example
 * ```tsx
 * const { optimisticChats, addOptimisticChat, removeOptimisticChat } = useOptimisticChats();
 *
 * // Add optimistic chat when user sends first message
 * addOptimisticChat(chatId, "New Chat");
 *
 * // Remove when server confirms or on error
 * removeOptimisticChat(chatId);
 * ```
 */
export function useOptimisticChats(): OptimisticChatsContextType {
	const context = useContext(OptimisticChatsContext)
	if (!context) {
		throw new ValidationError(
			"useOptimisticChats must be used within an OptimisticChatsProvider",
		)
	}
	return context
}
