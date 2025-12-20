'use client';

import { useSidebar } from '../hooks';
import { cn } from '@/lib/utils';

function MenuIcon({ className }: { className?: string }) {
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
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

export function SidebarToggle() {
  const { state, toggle } = useSidebar();

  return (
    <button
      onClick={toggle}
      className={cn(
        'p-2 rounded-lg hover:bg-muted transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary'
      )}
      aria-label={state.isOpen ? 'Close sidebar' : 'Open sidebar'}
      title="Toggle sidebar (Ctrl+B)"
    >
      <MenuIcon className="h-5 w-5" />
    </button>
  );
}
