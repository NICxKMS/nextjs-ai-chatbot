'use client';

import Link from 'next/link';
import { useSidebarState, useSidebarActions } from '../context';
import { ChatHistory } from './chat-history';
import { SidebarUserNav } from './sidebar-user-nav';

interface AppSidebarProps {
  userId?: string;
  userEmail?: string;
}

export function AppSidebar({ userId, userEmail }: AppSidebarProps) {
  const { open, openMobile, isMobile } = useSidebarState();
  const { setOpenMobile } = useSidebarActions();

  const isOpen = isMobile ? openMobile : open;

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && openMobile && (
        <div 
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpenMobile(false)}
        />
      )}
      
      <aside
        className={`
          flex flex-col bg-muted/50 border-r
          ${isMobile 
            ? 'fixed inset-y-0 left-0 z-50 w-72' 
            : 'relative w-64'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Link href="/" className="text-lg font-semibold">
            AI Chat
          </Link>
          <Link
            href="/"
            onClick={() => isMobile && setOpenMobile(false)}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            New Chat
          </Link>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-hidden">
          <ChatHistory userId={userId} />
        </div>

        {/* User nav */}
        {userId && (
          <SidebarUserNav userEmail={userEmail} />
        )}
      </aside>
    </>
  );
}
