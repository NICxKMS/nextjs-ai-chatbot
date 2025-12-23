"use client";

import {
    Check,
    Globe,
    Loader2,
    Lock,
    MoreHorizontal,
    Share,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VisibilityType } from "@/features/chat/types";
import { cn, createRateLimiter } from "@/lib/utils";
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
import type { ChatHistoryItem as ChatHistoryItemType } from "../types";

function MessageIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
    );
}

export type SidebarHistoryItemProps = {
    chat: ChatHistoryItemType;
    onDelete?: (id: string) => Promise<void> | void;
};

export const SidebarHistoryItem = memo(function SidebarHistoryItem({
    chat,
    onDelete,
}: SidebarHistoryItemProps) {
    const pathname = usePathname();
    const isActive = pathname === `/chat/${chat.id}`;
    const [visibility, setVisibility] = useState<VisibilityType>(
        chat.visibility || "private"
    );
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Rate limiter for visibility changes (3 per 10 seconds)
    const visibilityLimiterRef = useRef(
        createRateLimiter({ maxRequests: 3, windowMs: 10_000 })
    );

    const handleVisibilityChange = useCallback(
        async (newVisibility: VisibilityType) => {
            if (newVisibility === visibility || isUpdating) {
                return;
            }

            // Check rate limit
            const result = visibilityLimiterRef.current.check();
            if (!result.allowed) {
                toast.error(
                    `Too many changes. Wait ${Math.ceil(result.resetIn / 1000)}s`
                );
                return;
            }

            const previousVisibility = visibility;
            setVisibility(newVisibility);
            setIsUpdating(true);

            try {
                const response = await fetch("/api/chat/visibility", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chatId: chat.id,
                        visibility: newVisibility,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to update visibility");
                }

                toast.success(`Chat is now ${newVisibility}`);
            } catch {
                setVisibility(previousVisibility);
                toast.error("Failed to update visibility");
            } finally {
                setIsUpdating(false);
            }
        },
        [chat.id, isUpdating, visibility]
    );

    const handleDelete = useCallback(async () => {
        setIsDeleting(true);
        try {
            await onDelete?.(chat.id);
            toast.success("Chat deleted");
        } catch {
            toast.error("Failed to delete chat");
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    }, [chat.id, onDelete]);

    const handleOpenDeleteDialog = useCallback(() => {
        setShowDeleteDialog(true);
    }, []);

    const handleCloseDeleteDialog = useCallback((open: boolean) => {
        setShowDeleteDialog(open);
    }, []);

    const handleSetPrivate = useCallback(() => {
        handleVisibilityChange("private");
    }, [handleVisibilityChange]);

    const handleSetPublic = useCallback(() => {
        handleVisibilityChange("public");
    }, [handleVisibilityChange]);

    return (
        <>
            <div className="group relative" data-testid="chat-history-item">
                <Link
                    className={cn(
                        "flex items-center gap-2 truncate rounded-lg px-3 py-2 pr-8 text-sm",
                        "transition-colors hover:bg-muted",
                        isActive && "bg-muted font-medium"
                    )}
                    href={`/chat/${chat.id}`}
                >
                    <MessageIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{chat.title || "New Chat"}</span>
                    {visibility === "public" && (
                        <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                </Link>

                <div className="-translate-y-1/2 absolute top-1/2 right-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <DropdownMenu modal={true}>
                        <DropdownMenuTrigger asChild>
                            <button
                                aria-label="More options"
                                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                type="button"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="cursor-pointer">
                                    <Share className="h-4 w-4" />
                                    <span>Share</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem
                                            className="cursor-pointer flex-row justify-between"
                                            disabled={isUpdating}
                                            onClick={handleSetPrivate}
                                        >
                                            <div className="flex flex-row items-center gap-2">
                                                <Lock className="h-4 w-4" />
                                                <span>Private</span>
                                            </div>
                                            {visibility === "private" && (
                                                <Check className="ml-auto h-4 w-4" />
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer flex-row justify-between"
                                            disabled={isUpdating}
                                            onClick={handleSetPublic}
                                        >
                                            <div className="flex flex-row items-center gap-2">
                                                <Globe className="h-4 w-4" />
                                                <span>Public</span>
                                            </div>
                                            {visibility === "public" && (
                                                <Check className="ml-auto h-4 w-4" />
                                            )}
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>

                            <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
                                onSelect={handleOpenDeleteDialog}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <AlertDialog
                onOpenChange={handleCloseDeleteDialog}
                open={showDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete &quot;
                            {chat.title || "New Chat"}&quot;. This action cannot
                            be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeleting}
                            onClick={handleDelete}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
});
