/**
 * HistoryEmpty Component
 * Empty state when no chat history exists
 */

import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";

export function HistoryEmpty() {
    return (
        <SidebarGroup>
            <SidebarGroupContent>
                <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
                    Your conversations will appear here once you start chatting!
                </div>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export function HistoryLoginPrompt() {
    return (
        <SidebarGroup>
            <SidebarGroupContent>
                <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
                    Login to save and revisit previous chats!
                </div>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
