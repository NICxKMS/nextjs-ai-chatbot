'use client';

import { ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';

function SunIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
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
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export interface SidebarUserNavProps {
  user?: {
    email?: string;
    name?: string;
  };
  isLoading?: boolean;
  onSignOut?: () => void;
  onSignIn?: () => void;
}

export function SidebarUserNav({ user, isLoading, onSignOut, onSignIn }: SidebarUserNavProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isGuest = !user?.email || user.email.includes('guest');
  const displayLabel = isGuest ? 'Guest' : user?.email;
  const avatarSeed = user?.email ?? 'guest';

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="size-8 rounded-full bg-muted animate-pulse" />
        <div className="flex flex-col gap-1 flex-1">
          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          <div className="h-2 w-24 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 border-t" data-testid="user-nav-dropdown">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted">
            <Image
              src={`https://avatar.vercel.sh/${avatarSeed}`}
              alt={displayLabel || 'User Avatar'}
              width={32}
              height={32}
              className="rounded-full"
            />
            <div className="text-sm text-left flex-1 min-w-0">
              <div className="font-medium truncate">{isGuest ? 'Guest' : (user?.name || 'User')}</div>
              <div className="text-xs text-muted-foreground truncate">
                {displayLabel}
              </div>
            </div>
            <ChevronUp className="ml-auto size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === 'dark' ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isGuest ? (
            <DropdownMenuItem onClick={onSignIn}>
              <LogOutIcon className="h-4 w-4" />
              <span>Sign in</span>
            </DropdownMenuItem>
          ) : (
            onSignOut && (
              <DropdownMenuItem onClick={onSignOut}>
                <LogOutIcon className="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
