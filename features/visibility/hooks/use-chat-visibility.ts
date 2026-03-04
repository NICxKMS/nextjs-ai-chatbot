"use client"

import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { updateChatVisibility } from "@/features/visibility/actions/update-visibility"
import type { VisibilityType } from "@/features/visibility/types/visibility.types"

/**
 * Hook for managing chat visibility outside ChatSessionContext.
 *
 * Designed for consumers like SidebarHistoryItem that don't have access to
 * ChatSessionContext. Encapsulates useOptimistic + Server Action + error rollback.
 *
 * For VisibilitySelector inside ChatHeader, use ChatSessionContext instead (CV-01 Option A).
 */
export function useChatVisibility(chatId: string, initialVisibility: VisibilityType) {
	const [optimisticVisibility, setOptimisticVisibility] = useOptimistic(initialVisibility)
	const [isPending, startTransition] = useTransition()

	const setVisibility = (newVisibility: VisibilityType) => {
		startTransition(async () => {
			// Optimistic update — shown immediately
			setOptimisticVisibility(newVisibility)

			const result = await updateChatVisibility({
				chatId,
				visibility: newVisibility,
			})

			if (!result.success) {
				// Rollback — revert to original on failure
				// useOptimistic automatically reverts when the transition completes with failure
				toast.error("Failed to update visibility")
			}
		})
	}

	return {
		visibilityType: optimisticVisibility,
		setVisibilityType: setVisibility,
		isPending,
	}
}
