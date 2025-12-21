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

export type VisibilityType = "public" | "private";

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
