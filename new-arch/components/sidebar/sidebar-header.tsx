"use client";

/**
 * Sidebar Header
 * Header section with logo and action buttons
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { PlusIcon, TrashIcon } from "@/components/icons";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebar } from "./context";
import type { SidebarHeaderProps, SidebarUser } from "./types";

// ============================================================================
// Types
// ============================================================================

interface SidebarHeaderComponentProps extends SidebarHeaderProps {
    user?: SidebarUser;
    getChatHistoryPaginationKey?: () => string[];
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SidebarHeader - Header with logo, new chat, and delete all buttons
 */
export const SidebarHeader = forwardRef<
    HTMLDivElement,
    SidebarHeaderComponentProps
>(({ className, user, getChatHistoryPaginationKey, ...props }, ref) => {
    const router = useRouter();
    const { setOpenMobile } = useSidebar();
    const { mutate } = useSWRConfig();
    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
    const isLoggedIn = Boolean(user?.email);

    const handleDeleteAll = () => {
        const deletePromise = fetch("/api/history", { method: "DELETE" });

        toast.promise(deletePromise, {
            loading: "Deleting all chats...",
            success: () => {
                if (getChatHistoryPaginationKey) {
                    mutate(unstable_serialize(getChatHistoryPaginationKey));
                }
                router.push("/");
                setShowDeleteAllDialog(false);
                return "All chats deleted successfully";
            },
            error: "Failed to delete all chats",
        });
    };

    const handleNewChat = () => {
        setOpenMobile(false);
        router.push("/");
        router.refresh();
    };

    return (
        <>
            <div
                className={cn("flex flex-col gap-2 p-2", className)}
                data-sidebar="header"
                ref={ref}
                {...props}
            >
                <div className="flex w-full min-w-0 flex-col gap-1">
                    <div className="flex flex-row items-center justify-between">
                        <Link
                            className="flex flex-row items-center gap-3"
                            href="/"
                            onClick={() => setOpenMobile(false)}
                        >
                            <span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                                Assistant
                            </span>
                        </Link>
                        <div className="flex flex-row gap-1">
                            {isLoggedIn && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            className="h-8 p-1 md:h-fit md:p-2"
                                            onClick={() =>
                                                setShowDeleteAllDialog(true)
                                            }
                                            type="button"
                                            variant="ghost"
                                        >
                                            <TrashIcon />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        align="end"
                                        className="hidden md:block"
                                    >
                                        Delete All Chats
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        className="h-8 p-1 md:h-fit md:p-2"
                                        onClick={handleNewChat}
                                        type="button"
                                        variant="ghost"
                                    >
                                        <PlusIcon />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent
                                    align="end"
                                    className="hidden md:block"
                                >
                                    New Chat
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>

            <AlertDialog
                onOpenChange={setShowDeleteAllDialog}
                open={showDeleteAllDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete all your chats and remove them from our
                            servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll}>
                            Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
});
SidebarHeader.displayName = "SidebarHeader";
