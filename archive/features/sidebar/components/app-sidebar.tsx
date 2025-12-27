"use client";

import {
    AlertTriangleIcon,
    Loader2,
    Plus,
    RefreshCwIcon,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import { ErrorBoundary } from "@/shared/components";
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
import type { UpdateVisibilityAction } from "./sidebar-history-item";
import { SidebarUserNav } from "./sidebar-user-nav";

// =============================================================================
// SIDEBAR ERROR FALLBACK
// =============================================================================

type SidebarErrorFallbackProps = {
    error: Error | null;
    resetErrorBoundary: () => void;
};

function SidebarErrorFallback({
    error,
    resetErrorBoundary,
}: SidebarErrorFallbackProps) {
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = useCallback(async () => {
        if (isRetrying) {
            return;
        }
        setIsRetrying(true);
        try {
            resetErrorBoundary();
        } finally {
            setIsRetrying(false);
        }
    }, [isRetrying, resetErrorBoundary]);

    return (
        <div
            className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center"
            role="alert"
        >
            <div className="rounded-full bg-muted p-2">
                <AlertTriangleIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">
                    Sidebar unavailable
                </p>
                <p className="text-muted-foreground text-xs">
                    {error?.message || "An error occurred loading the sidebar"}
                </p>
            </div>
            <Button
                className="mt-2"
                disabled={isRetrying}
                onClick={handleRetry}
                size="sm"
                type="button"
                variant="outline"
            >
                <RefreshCwIcon
                    className={cn("mr-2 size-3", isRetrying && "animate-spin")}
                />
                {isRetrying ? "Retrying..." : "Try again"}
            </Button>
        </div>
    );
}

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
    /** Action to update chat visibility (injected from app layer) */
    updateVisibility?: UpdateVisibilityAction;
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
    updateVisibility,
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

    const handleSidebarError = useCallback(
        (error: Error, errorInfo: React.ErrorInfo) => {
            logger.error("Sidebar error boundary caught error", {
                error: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
            });
        },
        []
    );

    const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);
    const resetSidebarErrorBoundary = useCallback(() => {
        setErrorBoundaryKey((prev) => prev + 1);
    }, []);

    return (
        <>
            <ErrorBoundary
                fallback={
                    <Sidebar
                        className="group-data-[side=left]:border-r-0"
                        data-testid="app-sidebar"
                    >
                        <SidebarErrorFallback
                            error={null}
                            resetErrorBoundary={resetSidebarErrorBoundary}
                        />
                    </Sidebar>
                }
                key={errorBoundaryKey}
                onError={handleSidebarError}
            >
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
                                    prefetch={true}
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
                                                    onClick={
                                                        handleOpenDeleteDialog
                                                    }
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
                            updateVisibility={updateVisibility}
                        />
                    </SidebarContent>
                    <SidebarFooter>
                        <SidebarUserNav onSignOut={onSignOut} user={user} />
                    </SidebarFooter>
                </Sidebar>
            </ErrorBoundary>

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
