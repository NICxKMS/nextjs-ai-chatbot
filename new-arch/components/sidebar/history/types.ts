/**
 * History Component Types
 * Type definitions for sidebar history components
 */

import type { Chat } from "@/lib/data/schema";

// ============================================================================
// Chat Types
// ============================================================================

export type HistoryChat = Pick<
    Chat,
    "id" | "title" | "createdAt" | "visibility"
>;

export type ChatGroup = {
    label: string;
    chats: HistoryChat[];
    isOptimistic?: boolean;
};

export type GroupedChats = {
    today: HistoryChat[];
    yesterday: HistoryChat[];
    lastWeek: HistoryChat[];
    lastMonth: HistoryChat[];
    older: HistoryChat[];
};

// ============================================================================
// Component Props Types
// ============================================================================

export type HistoryProps = {
    user?: { email?: string | null };
    className?: string;
    onChatSelect?: (chatId: string) => void;
};

export type HistoryItemProps = {
    chat: HistoryChat;
    isActive?: boolean;
    isOptimistic?: boolean;
    onDelete?: (chatId: string) => void;
    setOpenMobile: (open: boolean) => void;
};

export type HistoryGroupProps = {
    group: ChatGroup;
    activeId?: string;
    onDelete?: (chatId: string) => void;
    setOpenMobile: (open: boolean) => void;
};

export type HistoryItemActionsProps = {
    chat: HistoryChat;
    isActive?: boolean;
};

// ============================================================================
// Data Types
// ============================================================================

export type ChatHistory = {
    chats: HistoryChat[];
    hasMore: boolean;
};

export type DateBoundaries = {
    oneWeekAgo: Date;
    oneMonthAgo: Date;
};
