'use client';

import Link from 'next/link';
import { useSidebar } from '../hooks';
import { SidebarHistory } from './sidebar-history';
import { SidebarUserNav } from './sidebar-user-nav';
import type { ChatHistoryItem } from '../types';
import { cn } from '@/lib/utils';

function BotIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export interface AppSidebarProps {
  chats?: ChatHistoryItem[];
  isLoading?: boolean;
  user?: { email?: string; name?: string };
  onNewChat?: () => void;
  onDeleteChat?: (id: string) => void;
  onDeleteAll?: () => void;
  onSignOut?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function AppSidebar({
  chats = [],
  isLoading,
  user,
  onNewChat,
  onDeleteChat,
  onSignOut,
  onLoadMore,
  hasMore,
}: AppSidebarProps) {
  const { state } = useSidebar();

  if (!state.isOpen) return null;

  return (
    <aside
      className={cn(
        'w-64 h-full flex flex-col border-r bg-background',
        'transition-transform duration-200',
        state.isMobile && 'absolute z-50 left-0 top-0 shadow-lg'
      )}
    >
      {/* Header */}
      <div className="p-2 border-b">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 px-2 py-1 font-semibold">
            <BotIcon className="h-5 w-5" />
            <span>AI Chat</span>
          </Link>
          <button onClick={onNewChat} className="p-2 rounded-lg hover:bg-muted" aria-label="New chat">
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-hidden">
        <SidebarHistory
          chats={chats}
          isLoading={isLoading}
          onDeleteChat={onDeleteChat}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
        />
      </div>

      {/* Footer */}
      <SidebarUserNav user={user} onSignOut={onSignOut} />
    </aside>
  );
}
