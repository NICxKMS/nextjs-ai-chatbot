// Context & Providers
export { SidebarProvider, useSidebarState, useSidebarActions } from './context';
export { OptimisticChatsProvider, useOptimisticChats, useChatHistory } from './hooks';

// Components
export { AppSidebar, ChatHistory, ChatHistoryItem, SidebarUserNav } from './components';

// Server Actions
export { deleteChat, deleteAllChats, renameChat } from './actions';

// Types
export type {
  ChatItem,
  ChatHistory as ChatHistoryType,
  OptimisticChat,
  DateGroup,
  GroupedChats,
  SidebarState,
  SidebarActions,
} from './types';
