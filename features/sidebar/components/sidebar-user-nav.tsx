'use client';

import { useState } from 'react';
import { deleteAllChats } from '../actions';

interface SidebarUserNavProps {
  userEmail?: string;
}

export function SidebarUserNav({ userEmail }: SidebarUserNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL chats? This cannot be undone.')) return;
    await deleteAllChats();
    setIsMenuOpen(false);
  };

  const handleSignOut = () => {
    // Will be implemented with auth
    window.location.href = '/api/auth/signout';
  };

  return (
    <div className="border-t p-2">
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent"
        >
          <span className="flex-1 text-left text-sm truncate">
            {userEmail || 'User'}
          </span>
          <span className="text-muted-foreground">⌄</span>
        </button>

        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0" 
              onClick={() => setIsMenuOpen(false)} 
            />
            <div className="absolute bottom-full left-0 right-0 mb-1 py-1 bg-popover border rounded-lg shadow-lg z-50">
              <button
                onClick={handleDeleteAll}
                className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                Delete all chats
              </button>
              <hr className="my-1" />
              <button
                onClick={handleSignOut}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
