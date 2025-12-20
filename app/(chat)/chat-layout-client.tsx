/**
 * Chat Layout Client Component
 *
 * Wraps the chat layout with client-side providers and handles
 * URL-based notifications.
 *
 * @module app/(chat)/chat-layout-client
 */

'use client';

import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useEffect } from 'react';
import { toast } from 'sonner';

import { DataStreamProvider } from '@/features/chat';
import { SidebarProvider, OptimisticChatsProvider } from '@/features/sidebar';
import { SidebarContainer } from './sidebar-container';

// Skeleton for sidebar loading state
function SidebarSkeleton() {
  return (
    <aside className="w-64 h-full flex flex-col border-r bg-background">
      <div className="p-2 border-b">
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </aside>
  );
}

// Loading indicator for main content
function ContentLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

// Inner component to handle search params (needs Suspense boundary)
function NoticeHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const notice = searchParams.get('notice');
    if (notice === 'chat_not_found') {
      toast.warning('This chat was not found. Redirected to the homepage.');
      // Clean the query param to avoid repeated toasts on refresh
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('notice');
        window.history.replaceState(null, '', url.toString());
      }
    } else if (notice === 'user_not_found') {
      toast.error('Your account could not be found. Switched to a guest session.');
      // Clean the query param to avoid repeated toasts on refresh
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('notice');
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [searchParams]);

  return null;
}

export interface ChatLayoutClientProps {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
}

export function ChatLayoutClient({
  children,
  defaultSidebarOpen = true,
}: ChatLayoutClientProps) {
  return (
    <>
      {/* Pyodide for Python artifact execution */}
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="lazyOnload"
      />

      <DataStreamProvider>
        <SidebarProvider defaultOpen={defaultSidebarOpen}>
          <OptimisticChatsProvider>
            {/* Handle URL notices */}
            <Suspense fallback={null}>
              <NoticeHandler />
            </Suspense>

            <div className="flex h-screen">
              <Suspense fallback={<SidebarSkeleton />}>
                <SidebarContainer />
              </Suspense>
              <main className="flex-1 flex flex-col min-w-0">
                <Suspense fallback={<ContentLoader />}>
                  {children}
                </Suspense>
              </main>
            </div>
          </OptimisticChatsProvider>
        </SidebarProvider>
      </DataStreamProvider>
    </>
  );
}
