"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { SidebarSkeleton } from "@/components/ui/skeleton-sidebar";
import { updateChatVisibility } from "@/features/chat/actions";
import { AppSidebar, useChatHistory } from "@/features/sidebar";
import { generateUUID } from "@/lib/utils";

function SidebarContent() {
    const router = useRouter();
    const { chats, isLoading, hasMore, loadMore, deleteChat, deleteAllChats } =
        useChatHistory();

    const handleNewChat = () => {
        const newId = generateUUID();
        router.push(`/chat/${newId}`);
    };

    return (
        <AppSidebar
            chats={chats}
            hasMore={hasMore}
            isLoading={isLoading}
            onDeleteAll={deleteAllChats}
            onDeleteChat={deleteChat}
            onLoadMore={loadMore}
            onNewChat={handleNewChat}
            updateVisibility={updateChatVisibility}
        />
    );
}

export function SidebarContainer() {
    return (
        <Suspense fallback={<SidebarSkeleton itemCount={5} />}>
            <SidebarContent />
        </Suspense>
    );
}
