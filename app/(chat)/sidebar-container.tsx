"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
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
            isLoading={isLoading}
            hasMore={hasMore}
            onNewChat={handleNewChat}
            onDeleteChat={deleteChat}
            onDeleteAll={deleteAllChats}
            onLoadMore={loadMore}
        />
    );
}

function SidebarSkeleton() {
    return (
        <aside className="w-64 h-full flex flex-col border-r bg-background">
            <div className="p-2 border-b">
                <div className="flex items-center justify-between">
                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                </div>
            </div>
            <div className="flex-1 p-2 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-10 bg-muted animate-pulse rounded"
                    />
                ))}
            </div>
        </aside>
    );
}

export function SidebarContainer() {
    return (
        <Suspense fallback={<SidebarSkeleton />}>
            <SidebarContent />
        </Suspense>
    );
}
