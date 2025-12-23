export type ChatHistoryItem = {
    id: string;
    title: string;
    createdAt: Date;
    visibility: "public" | "private";
    userId: string;
};

export type ChatGroup = {
    label: string;
    chats: ChatHistoryItem[];
};

// Re-export VisibilityType from canonical source
export type { VisibilityType } from "@/features/chat/types";

export type SidebarState = {
    isOpen: boolean;
    isMobile: boolean;
};

export type SidebarContext = {
    state: SidebarState;
    open: () => void;
    close: () => void;
    toggle: () => void;
    setIsMobile: (isMobile: boolean) => void;
};
