'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebarActions } from '../context';
import { deleteChat, renameChat } from '../actions';
import type { ChatItem } from '../types';

interface ChatHistoryItemProps {
  chat: ChatItem;
}

export function ChatHistoryItem({ chat }: ChatHistoryItemProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebarActions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);

  const isActive = pathname === `/chat/${chat.id}`;

  const handleDelete = async () => {
    if (!confirm('Delete this chat?')) return;
    await deleteChat(chat.id);
    setIsMenuOpen(false);
  };

  const handleRename = async () => {
    if (newTitle.trim() && newTitle !== chat.title) {
      await renameChat(chat.id, newTitle.trim());
    }
    setIsRenaming(false);
  };

  if (isRenaming) {
    return (
      <li className="px-2 py-1">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          className="w-full px-2 py-1 text-sm rounded border bg-background"
          autoFocus
        />
      </li>
    );
  }

  return (
    <li className="relative group">
      <Link
        href={`/chat/${chat.id}`}
        onClick={() => setOpenMobile(false)}
        className={`
          flex items-center gap-2 px-2 py-2 text-sm rounded-lg
          ${isActive 
            ? 'bg-accent text-accent-foreground' 
            : 'hover:bg-accent/50'}
        `}
      >
        <span className="flex-1 truncate">{chat.title}</span>
        {chat.visibility === 'public' && (
          <span className="text-xs text-muted-foreground">🌐</span>
        )}
      </Link>

      {/* Action menu */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1 rounded hover:bg-accent"
        >
          ⋯
        </button>
        
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0" 
              onClick={() => setIsMenuOpen(false)} 
            />
            <div className="absolute right-0 top-full mt-1 py-1 bg-popover border rounded-lg shadow-lg z-50 min-w-32">
              <button
                onClick={() => {
                  setIsRenaming(true);
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
              >
                Rename
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
