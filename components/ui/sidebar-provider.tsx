"use client"

import type * as React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import { cn } from "@/lib/utils/cn"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_WIDTH = "16rem"
export const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

function readSidebarCookie(cookieSource: string): boolean | null {
	const cookiePrefix = `${SIDEBAR_COOKIE_NAME}=`
	const cookie = cookieSource
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(cookiePrefix))

	if (!cookie) return null

	const value = cookie.slice(cookiePrefix.length)
	if (value === "true") return true
	if (value === "false") return false
	return null
}

export type SidebarContextProps = {
	state: "expanded" | "collapsed"
	open: boolean
	setOpen: (open: boolean | ((open: boolean) => boolean)) => void
	openMobile: boolean
	setOpenMobile: (open: boolean | ((open: boolean) => boolean)) => void
	isMobile: boolean
	toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextProps | null>(null)

function useSidebar() {
	const context = useContext(SidebarContext)
	if (!context) {
		throw new Error("useSidebar must be used within a <SidebarProvider />.")
	}

	return context
}

export type SidebarProviderProps = React.ComponentProps<"div"> & {
	defaultOpen?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	initialIsMobile?: boolean
}

function SidebarProvider({
	defaultOpen = true,
	open: openProp,
	onOpenChange: setOpenProp,
	initialIsMobile,
	className,
	style,
	children,
	ref,
	...props
}: SidebarProviderProps) {
	const isMobile = useIsMobile({ initialIsMobile })
	const [openMobile, setOpenMobile] = useState(false)
	const hasHydratedFromCookieRef = useRef(false)
	const hasSkippedInitialPersistRef = useRef(false)
	const lastPersistedValueRef = useRef(defaultOpen)

	const [_open, _setOpen] = useState(defaultOpen)
	const open = openProp ?? _open

	// Safety-net: re-read the cookie on the client after hydration to handle
	// cross-tab changes that occurred between SSR and client mount. During
	// normal operation the server-provided `defaultOpen` already matches the
	// cookie, so this effect is a no-op and produces no visible flash.
	useEffect(() => {
		if (openProp !== undefined || hasHydratedFromCookieRef.current) return
		hasHydratedFromCookieRef.current = true

		const persistedOpen = readSidebarCookie(document.cookie)
		if (persistedOpen !== null) {
			_setOpen(persistedOpen)
		}
	}, [openProp])

	useEffect(() => {
		if (!hasSkippedInitialPersistRef.current) {
			hasSkippedInitialPersistRef.current = true
			return
		}

		if (lastPersistedValueRef.current === open) return
		lastPersistedValueRef.current = open

		// biome-ignore lint/suspicious/noDocumentCookie: Synchronous cookie write needed inside useEffect; Cookie Store API is async with limited browser support
		document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
	}, [open])

	const setOpen = useCallback(
		(newValue: boolean | ((value: boolean) => boolean)) => {
			const openState = typeof newValue === "function" ? newValue(open) : newValue
			if (setOpenProp) {
				setOpenProp(openState)
			} else {
				_setOpen(openState)
			}
		},
		[setOpenProp, open],
	)

	const toggleSidebar = useCallback(() => {
		return isMobile ? setOpenMobile((prevOpen) => !prevOpen) : setOpen((prevOpen) => !prevOpen)
	}, [isMobile, setOpen])

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				toggleSidebar()
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [toggleSidebar])

	const state = open ? "expanded" : "collapsed"

	const contextValue = useMemo<SidebarContextProps>(
		() => ({
			state,
			open,
			setOpen,
			isMobile,
			openMobile,
			setOpenMobile,
			toggleSidebar,
		}),
		[state, open, setOpen, isMobile, openMobile, toggleSidebar],
	)

	return (
		<SidebarContext.Provider value={contextValue}>
			<div
				data-slot="sidebar-provider"
				className={cn(
					"group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
					className,
				)}
				ref={ref}
				style={
					{
						"--sidebar-width": SIDEBAR_WIDTH,
						"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
						...style,
					} as React.CSSProperties
				}
				{...props}
			>
				{children}
			</div>
		</SidebarContext.Provider>
	)
}

export { SidebarProvider, useSidebar }
