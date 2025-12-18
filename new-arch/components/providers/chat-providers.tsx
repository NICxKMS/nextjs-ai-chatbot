"use client";

/**
 * Chat Providers
 * Composed chat-level providers for chat feature functionality
 *
 * Wraps all chat-specific context providers into a single component
 * for cleaner composition and reduced nesting.
 */

import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { OptimisticChatsProvider } from "@/hooks/use-optimistic-chats";
import { SettingsProvider } from "@/lib/ui/settings-store";
import type { ChatProvidersProps } from "./types";

// ============================================================================
// Main Component
// ============================================================================

/**
 * ChatProviders - Composed chat-level providers
 *
 * Provider Stack:
 * 1. SettingsProvider - User settings context
 * 2. DataStreamProvider - AI response streaming
 * 3. OptimisticChatsProvider - Optimistic UI updates
 * 4. SidebarProvider - Sidebar state management
 *
 * @example
 * ```tsx
 * <AppProviders initialSession={session}>
 *   <ChatProviders defaultSidebarOpen={true}>
 *     <Chat />
 *   </ChatProviders>
 * </AppProviders>
 * ```
 */
export function ChatProviders({
    children,
    defaultSidebarOpen = true,
}: ChatProvidersProps) {
    return (
        <SettingsProvider>
            <DataStreamProvider>
                <OptimisticChatsProvider>
                    <SidebarProvider defaultOpen={defaultSidebarOpen}>
                        {children}
                    </SidebarProvider>
                </OptimisticChatsProvider>
            </DataStreamProvider>
        </SettingsProvider>
    );
}
