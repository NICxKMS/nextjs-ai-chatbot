/**
 * HistoryContainer Component
 * Main container orchestrating chat history display with delete dialog
 */

"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { useSidebar } from "@/components/ui/sidebar";
import { useOptimisticChats } from "@/hooks/use-optimistic-chats";

import { DeleteChatDialog } from "./delete-chat-dialog";
import { HistoryEmpty, HistoryLoginPrompt } from "./history-empty";
import { HistoryItem } from "./history-item";
import { HistoryList } from "./history-list";
import { HistorySkeleton } from "./history-skeleton";
import { useGroupedChats, useHistoryData } from "./hooks";
import type { HistoryChat, HistoryProps } from "./types";

export function HistoryContainer({ user }: HistoryProps) {
    const { setOpenMobile, open: isSidebarOpen } = useSidebar();
    const { id } = useParams();
    const router = useRouter();
    const { optimisticChats, removeOptimisticChat } = useOptimisticChats();
    const { isNewSession } = useAuth();

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const {
        chats,
        isLoading,
        isValidating,
        hasReachedEnd,
        isEmpty,
        loadMore,
        mutate,
    } = useHistoryData({
        user,
        isNewSession,
        optimisticChats: optimisticChats as HistoryChat[],
        removeOptimisticChat,
    });

    const groups = useGroupedChats(
        chats,
        optimisticChats as HistoryChat[],
        isSidebarOpen
    );

    const handleDelete = useCallback(() => {
        const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
            method: "DELETE",
        });

        toast.promise(deletePromise, {
            loading: "Deleting chat...",
            success: () => {
                mutate((chatHistories) =>
                    chatHistories?.map((h) => ({
                        ...h,
                        chats: h.chats.filter((c) => c.id !== deleteId),
                    }))
                );
                return "Chat deleted successfully";
            },
            error: () => {
                setDeleteId(null);
                return "Failed to delete chat";
            },
        });

        setShowDeleteDialog(false);
        if (deleteId === id) {
            router.push("/");
        }
    }, [deleteId, id, mutate, router]);

    const handleDeleteRequest = useCallback((chatId: string) => {
        setDeleteId(chatId);
        setShowDeleteDialog(true);
    }, []);

    const renderItem = useCallback(
        (
            item: { chat: HistoryChat; isOptimistic: boolean },
            isActive: boolean
        ) => (
            <HistoryItem
                chat={item.chat}
                isActive={isActive}
                isOptimistic={item.isOptimistic}
                key={
                    item.isOptimistic
                        ? `optimistic-${item.chat.id}`
                        : item.chat.id
                }
                onDelete={item.isOptimistic ? undefined : handleDeleteRequest}
                setOpenMobile={setOpenMobile}
            />
        ),
        [handleDeleteRequest, setOpenMobile]
    );

    if (!user) {
        return <HistoryLoginPrompt />;
    }
    if (isLoading) {
        return <HistorySkeleton />;
    }
    if (isEmpty && optimisticChats.length === 0) {
        return <HistoryEmpty />;
    }

    return (
        <>
            <HistoryList
                activeId={id as string}
                groups={groups}
                hasReachedEnd={hasReachedEnd}
                isValidating={isValidating}
                onDelete={handleDeleteRequest}
                onEndReached={loadMore}
                renderItem={renderItem}
                setOpenMobile={setOpenMobile}
            />
            <DeleteChatDialog
                onConfirm={handleDelete}
                onOpenChange={setShowDeleteDialog}
                open={showDeleteDialog}
            />
        </>
    );
}
