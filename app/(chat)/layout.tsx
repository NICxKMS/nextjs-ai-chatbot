/**
 * Chat Layout
 *
 * Provides the base layout structure for all chat pages.
 * Includes sidebar and main content area.
 *
 * @module app/(chat)/layout
 */

import type { PropsWithChildren } from 'react';
import { SidebarProvider, OptimisticChatsProvider } from '@/features/sidebar';
import { SidebarContainer } from './sidebar-container';

export default function ChatLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider defaultOpen={true}>
      <OptimisticChatsProvider>
        <div className="flex h-screen">
          <SidebarContainer />
          <main className="flex-1 flex flex-col min-w-0">{children}</main>
        </div>
      </OptimisticChatsProvider>
    </SidebarProvider>
  );
}
