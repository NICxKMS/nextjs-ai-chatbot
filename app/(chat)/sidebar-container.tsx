"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
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
        />
    );
}

function SidebarSkeleton() {
    return (
        <aside className="flex h-full w-64 flex-col border-r bg-background">
            <div className="border-b p-2">
                <div className="flex items-center justify-between">
                    <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                </div>
            </div>
            <div className="flex-1 space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        className="h-10 animate-pulse rounded bg-muted"
                        key={i}
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
