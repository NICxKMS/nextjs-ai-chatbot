"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/shared/components/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    useSidebar,
} from "@/shared/ui/sidebar";
import type { ChatHistoryItem } from "../types";
import { SidebarHistory } from "./sidebar-history";
import { SidebarUserNav } from "./sidebar-user-nav";

export type AppSidebarProps = {
    chats?: ChatHistoryItem[];
    isLoading?: boolean;
    user?: { email?: string; name?: string };
    onNewChat?: () => void;
    onDeleteChat?: (id: string) => Promise<void> | void;
    onDeleteAll?: () => Promise<void> | void;
    onSignOut?: () => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
};

export function AppSidebar({
    chats = [],
    isLoading,
    user,
    onNewChat,
    onDeleteChat,
    onDeleteAll,
    onSignOut,
    onLoadMore,
    hasMore,
}: AppSidebarProps) {
    const { setOpenMobile } = useSidebar();
    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const handleNewChat = useCallback(() => {
        setOpenMobile(false);
        onNewChat?.();
    }, [setOpenMobile, onNewChat]);

    const handleDeleteAll = useCallback(async () => {
        setIsDeletingAll(true);
        try {
            await onDeleteAll?.();
            toast.success("All chats deleted");
        } catch {
            toast.error("Failed to delete chats");
        } finally {
            setIsDeletingAll(false);
            setShowDeleteAllDialog(false);
        }
    }, [onDeleteAll]);

    const handleOpenDeleteDialog = useCallback(() => {
        setShowDeleteAllDialog(true);
    }, []);

    const handleCloseDeleteDialog = useCallback((open: boolean) => {
        setShowDeleteAllDialog(open);
    }, []);

    const handleLinkClick = useCallback(() => {
        setOpenMobile(false);
    }, [setOpenMobile]);

    return (
        <>
            <Sidebar
                className="group-data-[side=left]:border-r-0"
                data-testid="app-sidebar"
            >
                <SidebarHeader>
                    <SidebarMenu>
                        <div className="flex flex-row items-center justify-between">
                            <Link
                                className="flex flex-row items-center gap-3"
                                href="/"
                                onClick={handleLinkClick}
                            >
                                <h2 className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                                    Assistant
                                </h2>
                            </Link>
                            <div className="flex flex-row gap-1">
                                {user && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                aria-label="Delete all chats"
                                                className="h-8 p-1 md:h-fit md:p-2"
                                                data-testid="delete-all-chats-button"
                                                onClick={handleOpenDeleteDialog}
                                                type="button"
                                                variant="ghost"
                                            >
                                                <Trash2 className="size-4" />
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
                                            aria-label="Start new chat"
                                            className="h-8 p-1 md:h-fit md:p-2"
                                            data-testid="new-chat-button"
                                            onClick={handleNewChat}
                                            type="button"
                                            variant="ghost"
                                        >
                                            <Plus className="size-4" />
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
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarHistory
                        chats={chats}
                        hasMore={hasMore}
                        isLoading={isLoading}
                        onDeleteChat={onDeleteChat}
                        onLoadMore={onLoadMore}
                    />
                </SidebarContent>
                <SidebarFooter>
                    <SidebarUserNav onSignOut={onSignOut} user={user} />
                </SidebarFooter>
            </Sidebar>

            <AlertDialog
                onOpenChange={handleCloseDeleteDialog}
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
                        <AlertDialogCancel disabled={isDeletingAll}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeletingAll}
                            onClick={handleDeleteAll}
                        >
                            {isDeletingAll ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete All"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
