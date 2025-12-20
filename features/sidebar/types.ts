export interface ChatItem {
  id: string;
  title: string;
  createdAt: Date;
  visibility: 'private' | 'public';
}

export interface ChatHistory {
  chats: ChatItem[];
  hasMore: boolean;
}

export interface OptimisticChat {
  id: string;
  title: string;
  createdAt: Date;
}

export type DateGroup = 'today' | 'yesterday' | 'lastWeek' | 'lastMonth' | 'older';

export interface GroupedChats {
  group: DateGroup;
  label: string;
  chats: ChatItem[];
}

// Sidebar state types
export interface SidebarState {
  open: boolean;
  openMobile: boolean;
  isMobile: boolean;
}

export interface SidebarActions {
  setOpen: (open: boolean) => void;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
}
