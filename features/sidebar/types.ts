export interface ChatHistoryItem {
    id: string;
    title: string;
    createdAt: Date;
    visibility: "public" | "private";
    userId: string;
}

export interface ChatGroup {
    label: string;
    chats: ChatHistoryItem[];
}

export type VisibilityType = "public" | "private";

export interface SidebarState {
    isOpen: boolean;
    isMobile: boolean;
}

export interface SidebarContext {
    state: SidebarState;
    open: () => void;
    close: () => void;
    toggle: () => void;
    setIsMobile: (isMobile: boolean) => void;
}
