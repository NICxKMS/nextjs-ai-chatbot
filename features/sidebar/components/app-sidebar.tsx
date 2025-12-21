'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SidebarHistory } from './sidebar-history';
import { SidebarUserNav } from './sidebar-user-nav';
import type { ChatHistoryItem } from '../types';
import { Button } from '@/shared/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/tooltip';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/shared/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

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

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
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
  onDeleteAll,
  onSignOut,
  onLoadMore,
  hasMore,
}: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const handleNewChat = () => {
    setOpenMobile(false);
    onNewChat?.();
  };

  const handleDeleteAll = () => {
    onDeleteAll?.();
    setShowDeleteAllDialog(false);
  };

  return (
    <>
      <Sidebar className="group-data-[side=left]:border-r-0" data-testid="app-sidebar">
        <SidebarHeader>
          <SidebarMenu>
            <div className="flex flex-row items-center justify-between">
              <Link
                className="flex flex-row items-center gap-3"
                href="/"
                onClick={() => setOpenMobile(false)}
              >
                <span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                  Assistant
                </span>
              </Link>
              <div className="flex flex-row gap-1">
                {user && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="h-8 p-1 md:h-fit md:p-2"
                        onClick={() => setShowDeleteAllDialog(true)}
                        type="button"
                        variant="ghost"
                        data-testid="delete-all-chats-button"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="hidden md:block">
                      Delete All Chats
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-8 p-1 md:h-fit md:p-2"
                      onClick={handleNewChat}
                      type="button"
                      variant="ghost"
                      data-testid="new-chat-button"
                    >
                      <PlusIcon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent align="end" className="hidden md:block">
                    New Chat
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarHistory
            chats={chats}
            isLoading={isLoading}
            onDeleteChat={onDeleteChat}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
          />
        </SidebarContent>
        <SidebarFooter>
          <SidebarUserNav user={user} onSignOut={onSignOut} />
        </SidebarFooter>
      </Sidebar>

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
