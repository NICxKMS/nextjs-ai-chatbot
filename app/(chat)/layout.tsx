/**
 * Chat Layout
 *
 * Provides the base layout structure for all chat pages.
 * Includes sidebar, providers, and main content area.
 *
 * @module app/(chat)/layout
 */

import { cookies, headers } from 'next/headers';
import type { PropsWithChildren } from 'react';
import { ChatLayoutClient } from './chat-layout-client';

export default async function ChatLayout({ children }: PropsWithChildren) {
  const headersList = await headers();
  const cookieStore = await cookies();

  // Detect mobile from header (set by middleware)
  const isMobile = headersList.get('x-device-type') === 'mobile';
  
  // Get sidebar state from cookie, default to open on desktop
  const sidebarCookie = cookieStore.get('sidebar:state')?.value;
  const defaultSidebarOpen = isMobile ? false : sidebarCookie !== 'false';

  return (
    <ChatLayoutClient defaultSidebarOpen={defaultSidebarOpen}>
      {children}
    </ChatLayoutClient>
  );
}
