/**
 * Sidebar State Hook
 *
 * Custom hook for sidebar-specific state management beyond the base
 * useSidebar from UI library. Provides history loading and state persistence.
 *
 * @module features/sidebar/hooks/use-sidebar
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import { useSidebar } from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"

import type { UseSidebarStateReturn } from "../types"

/**
 * Enhanced sidebar state management hook
 *
 * Provides additional sidebar state management including:
 * - Expanded state tracking
 * - Mobile responsiveness
 * - State persistence helpers
 *
 * @returns Sidebar state and actions
 */
export function useSidebarState(): UseSidebarStateReturn {
	const { open, setOpen, state } = useSidebar()
	const isMobile = useIsMobile()

	// Track expanded state for components that need it
	const [isExpanded, setIsExpanded] = useState(state === "expanded")

	// Sync expanded state with sidebar state
	useEffect(() => {
		setIsExpanded(state === "expanded")
	}, [state])

	// Toggle sidebar
	const toggle = useCallback(() => {
		setOpen(!open)
	}, [open, setOpen])

	// Expand sidebar
	const expand = useCallback(() => {
		setOpen(true)
	}, [setOpen])

	// Collapse sidebar
	const collapse = useCallback(() => {
		setOpen(false)
	}, [setOpen])

	return {
		isExpanded,
		toggle,
		expand,
		collapse,
		isMobile,
	}
}
