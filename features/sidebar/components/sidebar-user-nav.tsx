"use client"

import { ChevronUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { unstable_rethrow } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { LoaderIcon } from "@/components/icons"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { logout } from "@/features/auth/actions/logout"
import { useSession } from "@/features/auth/components/session-provider"

// ── Types ──────────────────────────────────────────────────────

interface SidebarUserNavProps {
	user: { email?: string | null }
}

// ── Component ──────────────────────────────────────────────────

/**
 * Sidebar footer user navigation — avatar, theme toggle, and auth action.
 *
 * Renders inside SidebarFooter: SidebarMenu → SidebarMenuItem → DropdownMenu.
 * Includes a hydration guard (mounted state) to prevent SSR/client mismatch
 * since auth state and theme are unknown on the server.
 */
export function SidebarUserNav({ user }: SidebarUserNavProps) {
	const { session, isLoading, isGuest } = useSession()
	const { setTheme, resolvedTheme } = useTheme()
	const [mounted, setMounted] = useState(false)
	const [isPending, startTransition] = useTransition()

	useEffect(() => {
		setMounted(true)
	}, [])

	const isAuthenticated = session !== null && !isGuest
	const avatarSeed = user.email ?? "guest"
	const displayLabel = isAuthenticated ? (user.email ?? "User") : "Guest"

	// ── Loading skeleton (hydration guard) ──────────────────────

	const showSkeleton = !mounted || isLoading

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						{showSkeleton ? (
							<SidebarMenuButton className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
								<div className="flex flex-row items-center gap-2">
									<div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
									<span className="animate-pulse rounded-md bg-zinc-500/30 text-transparent">
										Loading auth status
									</span>
								</div>
								<div className="animate-spin text-zinc-500">
									<LoaderIcon />
								</div>
							</SidebarMenuButton>
						) : (
							<SidebarMenuButton
								className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								data-testid="user-nav-button"
							>
								<Image
									alt={displayLabel}
									className="rounded-full"
									height={24}
									sizes="24px"
									src={`https://avatar.vercel.sh/${avatarSeed}`}
									width={24}
								/>
								<span className="truncate" data-testid="user-email">
									{displayLabel}
								</span>
								<ChevronUp className="ml-auto" />
							</SidebarMenuButton>
						)}
					</DropdownMenuTrigger>

					<DropdownMenuContent
						className="w-(--radix-popper-anchor-width)"
						data-testid="user-nav-menu"
						side="top"
					>
						{/* Theme toggle */}
						<DropdownMenuItem
							className="cursor-pointer"
							data-testid="user-nav-item-theme"
							onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
						>
							{mounted
								? `Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`
								: "Toggle theme"}
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						{/* Auth action: login link or sign out */}
						{isAuthenticated ? (
							<DropdownMenuItem
								className="cursor-pointer"
								data-testid="user-nav-item-auth"
								disabled={isPending}
								onSelect={() => {
									startTransition(async () => {
										try {
											await logout()
										} catch (error) {
											// logout() calls redirect("/login") which throws
											// NEXT_REDIRECT — re-throw so Next.js handles it.
											unstable_rethrow(error)
											// Only show error for genuine failures.
											toast.error("Failed to sign out, please try again.")
										}
									})
								}}
							>
								{isPending ? "Signing out…" : "Sign out"}
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem asChild data-testid="user-nav-item-auth">
								<Link className="cursor-pointer" href="/login">
									Login to your account
								</Link>
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
