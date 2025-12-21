"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    MoreHorizontal,
    Share,
    Lock,
    Globe,
    Trash2,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import type { ChatHistoryItem as ChatHistoryItemType } from "../types";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/shared/components/dropdown-menu";

type VisibilityType = "public" | "private";

function MessageIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
    );
}

export interface SidebarHistoryItemProps {
    chat: ChatHistoryItemType;
    onDelete?: (id: string) => void;
}

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

    const handleVisibilityChange = async (newVisibility: VisibilityType) => {
        if (newVisibility === visibility || isUpdating) return;

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
    };

    return (
        <div className="relative group" data-testid="chat-history-item">
            <Link
                href={`/chat/${chat.id}`}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm truncate pr-8",
                    "hover:bg-muted transition-colors",
                    isActive && "bg-muted font-medium"
                )}
            >
                <MessageIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{chat.title || "New Chat"}</span>
                {visibility === "public" && (
                    <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
            </Link>

            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu modal={true}>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                            aria-label="More options"
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
                                        onClick={() =>
                                            handleVisibilityChange("private")
                                        }
                                        disabled={isUpdating}
                                    >
                                        <div className="flex flex-row items-center gap-2">
                                            <Lock className="h-4 w-4" />
                                            <span>Private</span>
                                        </div>
                                        {visibility === "private" && (
                                            <Check className="h-4 w-4 ml-auto" />
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer flex-row justify-between"
                                        onClick={() =>
                                            handleVisibilityChange("public")
                                        }
                                        disabled={isUpdating}
                                    >
                                        <div className="flex flex-row items-center gap-2">
                                            <Globe className="h-4 w-4" />
                                            <span>Public</span>
                                        </div>
                                        {visibility === "public" && (
                                            <Check className="h-4 w-4 ml-auto" />
                                        )}
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuItem
                            className="cursor-pointer text-destructive dark:text-red-500 focus:bg-destructive/15 focus:text-destructive"
                            onSelect={() => onDelete?.(chat.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
});
