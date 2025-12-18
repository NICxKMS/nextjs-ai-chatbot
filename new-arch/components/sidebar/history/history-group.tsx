/**
 * HistoryGroup Component
 * Date-grouped section of chat history
 */

"use client";

import { HistoryItem } from "./history-item";
import type { HistoryGroupProps } from "./types";

export function HistoryGroup({
    group,
    activeId,
    onDelete,
    setOpenMobile,
}: HistoryGroupProps) {
    // Skip rendering header for optimistic pseudo-group
    const showHeader = group.label !== "__optimistic__";
    // Use "Today" label for optimistic group
    const displayLabel =
        group.label === "__optimistic__" ? "Today" : group.label;

    return (
        <div>
            {showHeader && (
                <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
                    {displayLabel}
                </div>
            )}
            {!showHeader && (
                <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
                    Today
                </div>
            )}
            {group.chats.map((chat) => (
                <HistoryItem
                    chat={chat}
                    isActive={chat.id === activeId}
                    isOptimistic={group.isOptimistic}
                    key={group.isOptimistic ? `optimistic-${chat.id}` : chat.id}
                    onDelete={group.isOptimistic ? undefined : onDelete}
                    setOpenMobile={setOpenMobile}
                />
            ))}
        </div>
    );
}
