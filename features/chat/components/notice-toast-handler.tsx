/**
 * Notice Toast Handler Component
 *
 * Client component that handles notice toast notifications from URL parameters.
 * Must be wrapped in a Suspense boundary because it uses useSearchParams.
 *
 * @module features/chat/components/notice-toast-handler
 */

"use client"

import { useNoticeToast } from "../hooks/use-notice-toast"

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * Component that handles notice toast notifications from URL parameters.
 *
 * This component:
 * - Reads the `notice` query parameter from the URL
 * - Displays the appropriate toast notification
 * - Removes the `notice` parameter from the URL
 *
 * Must be wrapped in a Suspense boundary because it uses useSearchParams.
 *
 * @example
 * ```tsx
 * // In a layout or page component
 * <Suspense fallback={null}>
 *   <NoticeToastHandler />
 * </Suspense>
 * ```
 */
export function NoticeToastHandler(): null {
	useNoticeToast()
	return null
}
