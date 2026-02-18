/**
 * Notice Toast Handler Hook
 *
 * Handles notice/toast notifications from URL parameters.
 * Reads the `notice` query parameter and displays appropriate toast notifications.
 *
 * Supported notice types:
 * - `chat_not_found` - Warning toast for missing chat redirects
 * - `user_not_found` - Error toast for missing user account
 * - `success:Message` - Success toast with custom message
 * - `error:Message` - Error toast with custom message
 * - `info:Message` - Info toast with custom message
 *
 * @module features/chat/hooks/use-notice-toast
 */

"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"

// =============================================================================
// Types
// =============================================================================

/**
 * Notice type identifiers supported by the handler.
 */
type NoticeType =
	| "chat_not_found"
	| "user_not_found"
	| "success"
	| "error"
	| "info"

/**
 * Parsed notice from URL parameter.
 */
interface ParsedNotice {
	/** Type of notice */
	type: NoticeType
	/** Optional custom message */
	message?: string
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default messages for built-in notice types.
 */
const DEFAULT_MESSAGES: Record<NoticeType, string> = {
	chat_not_found: "This chat was not found. Redirected to the homepage.",
	user_not_found:
		"Your account could not be found. Switched to a guest session.",
	success: "Operation completed successfully.",
	error: "An error occurred.",
	info: "Information.",
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parses the notice parameter from the URL.
 *
 * Format: `type` or `type:message`
 * Examples:
 * - `chat_not_found` -> { type: "chat_not_found" }
 * - `success:Your changes have been saved` -> { type: "success", message: "Your changes have been saved" }
 *
 * @param noticeParam - The raw notice parameter value
 * @returns Parsed notice object or null if invalid
 */
function parseNotice(noticeParam: string | null): ParsedNotice | null {
	if (!noticeParam) {
		return null
	}

	// Check for built-in notice types first
	if (noticeParam === "chat_not_found") {
		return { type: "chat_not_found" }
	}

	if (noticeParam === "user_not_found") {
		return { type: "user_not_found" }
	}

	// Check for typed notices with custom messages (e.g., "success:Message")
	const colonIndex = noticeParam.indexOf(":")
	if (colonIndex !== -1) {
		const type = noticeParam.slice(0, colonIndex) as NoticeType
		const message = noticeParam.slice(colonIndex + 1)

		// Validate the type is a valid toast type
		if (type === "success" || type === "error" || type === "info") {
			return { type, message }
		}
	}

	// Invalid format - return as info type with the whole param as message
	return { type: "info", message: noticeParam }
}

/**
 * Displays a toast notification based on the notice type.
 *
 * @param notice - The parsed notice object
 */
function displayNotice(notice: ParsedNotice): void {
	const message = notice.message ?? DEFAULT_MESSAGES[notice.type]

	switch (notice.type) {
		case "chat_not_found":
			toast.warning(message)
			break
		case "user_not_found":
			toast.error(message)
			break
		case "success":
			toast.success(message)
			break
		case "error":
			toast.error(message)
			break
		case "info":
			toast.info(message)
			break
		default:
			toast.info(message)
	}
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to handle notice toast notifications from URL parameters.
 *
 * This hook:
 * 1. Reads the `notice` query parameter from the URL
 * 2. Parses the notice type and optional message
 * 3. Displays the appropriate toast notification
 * 4. Removes the `notice` parameter from the URL to prevent repeated toasts
 *
 * @example
 * ```tsx
 * // In a client component
 * function MyComponent() {
 *   useNoticeToast()
 *   return <div>...</div>
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Server-side redirect with notice
 * redirect("/?notice=chat_not_found")
 * redirect("/?notice=success:Your profile has been updated")
 * ```
 */
export function useNoticeToast(): void {
	const searchParams = useSearchParams()
	const router = useRouter()

	useEffect(() => {
		const noticeParam = searchParams.get("notice")
		const notice = parseNotice(noticeParam)

		if (notice) {
			// Display the toast notification
			displayNotice(notice)

			// Remove the notice parameter from the URL
			// Using replaceState to avoid adding to browser history
			if (typeof window !== "undefined") {
				const url = new URL(window.location.href)
				url.searchParams.delete("notice")

				// Use router.replace to update URL without navigation
				// Preserve other query parameters
				const newUrl = url.pathname + (url.search || "")
				router.replace(newUrl, { scroll: false })
			}
		}
	}, [searchParams, router])
}

// =============================================================================
// Exports
// =============================================================================

export { parseNotice, displayNotice }
export type { NoticeType, ParsedNotice }
