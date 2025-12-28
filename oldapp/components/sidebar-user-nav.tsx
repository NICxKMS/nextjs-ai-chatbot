"use client";

import { ChevronUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useAuth } from "@/components/auth-provider";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getSupabaseBrowserClient } from "@/lib/auth/client";
import { LoaderIcon } from "./icons";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";

export function SidebarUserNav({ user }: { user: { email?: string | null } }) {
    const router = useRouter();
    const { session, status } = useAuth();
    const { setTheme, resolvedTheme } = useTheme();
    const { mutate } = useSWRConfig();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isGuest = session?.user?.type === "guest";
    const isAuthenticated = Boolean(session);
    const isAnonymous = !isAuthenticated || isGuest;
    const avatarSeed = user.email ?? "guest";
    const displayLabel = isAnonymous ? "Guest" : (user.email ?? "User");
    const authActionLabel = isAnonymous ? "Login to your account" : "Sign out";

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {/* Show loading skeleton until hydrated AND auth status resolved
                            This prevents hydration mismatch since SSR cannot know auth state */}
                        {!mounted || status === "loading" ? (
                            <SidebarMenuButton className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                                <div className="flex flex-row gap-2">
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
                                {/* Note: placeholder="blur" requires blurDataURL which cannot be
                                    pre-generated for dynamic external avatar URLs. The avatar service
                                    generates unique images per seed, making static blur data impossible. */}
                                <Image
                                    alt={displayLabel}
                                    className="rounded-full"
                                    height={24}
                                    sizes="24px"
                                    src={`https://avatar.vercel.sh/${avatarSeed}`}
                                    width={24}
                                />
                                <span
                                    className="truncate"
                                    data-testid="user-email"
                                >
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
                        <DropdownMenuItem
                            className="cursor-pointer"
                            data-testid="user-nav-item-theme"
                            onSelect={() =>
                                setTheme(
                                    resolvedTheme === "dark" ? "light" : "dark"
                                )
                            }
                        >
                            {mounted
                                ? `Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`
                                : "Toggle theme"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            asChild
                            data-testid="user-nav-item-auth"
                        >
                            <button
                                className="w-full cursor-pointer"
                                onClick={() => {
                                    if (status === "loading") {
                                        toast({
                                            type: "error",
                                            description:
                                                "Checking authentication status, please try again!",
                                        });

                                        return;
                                    }

                                    if (!session || isGuest) {
                                        router.push("/login");
                                    } else {
                                        // Call server-side logout first to properly invalidate cookies
                                        fetch("/api/auth/logout", {
                                            method: "POST",
                                            credentials: "include",
                                        })
                                            .then(() =>
                                                getSupabaseBrowserClient().auth.signOut()
                                            )
                                            .then(() => {
                                                // Clear SWR cache to prevent stale authenticated user chats
                                                // from appearing after logout
                                                mutate(
                                                    unstable_serialize(
                                                        getChatHistoryPaginationKey
                                                    ),
                                                    undefined,
                                                    { revalidate: false }
                                                );
                                                router.push("/");
                                                router.refresh();
                                            })
                                            .catch(() => {
                                                toast({
                                                    type: "error",
                                                    description:
                                                        "Failed to sign out, please try again.",
                                                });
                                            });
                                    }
                                }}
                                type="button"
                            >
                                {authActionLabel}
                            </button>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
